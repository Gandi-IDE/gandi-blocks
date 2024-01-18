/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Object representing a workspace.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Workspace');

goog.require('Blockly.VariableMap');
goog.require('Blockly.ProcedureMap');
goog.require('Blockly.WorkspaceComment');
goog.require('goog.array');
goog.require('goog.math');


/**
 * Class for a workspace.  This is a data structure that contains blocks.
 * There is no UI, and can be created headlessly.
 * @param {!Blockly.Options=} opt_options Dictionary of options.
 * @constructor
 */
Blockly.Workspace = function(opt_options) {
  /** @type {string} */
  this.id = Blockly.utils.genUid();
  Blockly.Workspace.WorkspaceDB_[this.id] = this;
  /** @type {!Blockly.Options} */
  this.options = opt_options || {};
  /** @type {boolean} */
  this.RTL = !!this.options.RTL;
  /** @type {boolean} */
  this.horizontalLayout = !!this.options.horizontalLayout;
  /** @type {number} */
  this.toolboxPosition = this.options.toolboxPosition;

  /**
   * @type {!Array.<!Blockly.Block>}
   * @private
   */
  this.topBlocks_ = [];
  /**
   * @type {!Array.<!Blockly.WorkspaceComment>}
   * @private
   */
  this.topComments_ = [];
  /**
   * @type {!Object}
   * @private
   */
  this.commentDB_ = Object.create(null);
  /**
   * @type {!Array.<!Function>}
   * @private
   */
  this.listeners_ = [];
  /**
   * @type {!Object<Blockly.frame>}
   * @private
   */
  this.topFrames_ = [];

  /**
   * @type {!Object}
   * @private
   */
  this.frameDB_ = Object.create(null);

  /** @type {!Array.<!Function>} */
  this.tapListeners_ = [];

  /**
   * @typedef DeletionCallbackFunc
   * @type {(block: Blockly.BlockSvg, undoFunc: Function, ws: Blockly.Workspace) => boolean | void}
   *  return <code>true</code> to stop firing the rest of callbacks
   */

  /**
   * Listeners for watching block deletion
   * @type {Array.<DeletionCallbackFunc>}
   * @private
   */
  this.deletionListeners_ = [];

  /**
   * @type {!Array.<!Blockly.Events.Abstract>}
   * @protected
   */
  this.undoStack_ = [];

  /**
   * @type {!Array.<!Blockly.Events.Abstract>}
   * @protected
   */
  this.redoStack_ = [];

  /**
   * @type {!Object}
   * @private
   */
  this.blockDB_ = Object.create(null);

  /**
   * @type {!Blockly.VariableMap}
   * A map from variable type to list of variable names.  The lists contain all
   * of the named variables in the workspace, including variables
   * that are not currently in use.
   * @private
   */
  this.variableMap_ = new Blockly.VariableMap(this);

  this.globalProcedureMap_ = new Blockly.ProcedureMap(this);

  /**
   * Blocks in the flyout can refer to variables that don't exist in the main
   * workspace.  For instance, the "get item in list" block refers to an "item"
   * variable regardless of whether the variable has been created yet.
   * A FieldVariable must always refer to a Blockly.VariableModel.  We reconcile
   * these by tracking "potential" variables in the flyout.  These variables
   * become real when references to them are dragged into the main workspace.
   * @type {!Blockly.VariableMap}
   * @private
   */
  this.potentialVariableMap_ = null;
};

/**
 * Returns `true` if the workspace is visible and `false` if it's headless.
 * @type {boolean}
 */
Blockly.Workspace.prototype.rendered = false;

/**
 * Returns `true` if the workspace is currently in the process of a bulk clear.
 * @type {boolean}
 * @package
 */
Blockly.Workspace.prototype.isClearing = false;

/**
 * Maximum number of undo events in stack. `0` turns off undo, `Infinity` sets it to unlimited.
 * @type {number}
 */
Blockly.Workspace.prototype.MAX_UNDO = 1024;

// TODO (#1354) Update this function when it is fixed upstream
/**
 * Refresh the toolbox. This is a no-op in a non-rendered workspace,
 * but may be overriden by subclasses.
 * @private
 */
Blockly.Workspace.prototype.refreshToolboxSelection_ = function() {
  // No-op. Overriden by subclass.
};

/**
 * Dispose of this workspace.
 * Unlink from all DOM elements to prevent memory leaks.
 */
Blockly.Workspace.prototype.dispose = function() {
  this.listeners_.length = 0;
  this.deletionListeners_.length = 0;
  this.clear();
  // Remove from workspace database.
  delete Blockly.Workspace.WorkspaceDB_[this.id];
};

/**
 * Angle away from the horizontal to sweep for blocks.  Order of execution is
 * generally top to bottom, but a small angle changes the scan to give a bit of
 * a left to right bias (reversed in RTL).  Units are in degrees.
 * See: http://tvtropes.org/pmwiki/pmwiki.php/Main/DiagonalBilling.
 */
Blockly.Workspace.SCAN_ANGLE = 3;

/**
 * Add a block to some frame.
 * @param {!Blockly.Block} block Block to add.
 * @returns {!Blockly.Frame} If the addition is successful, the Frame to which it belongs is returned
 */
Blockly.Workspace.prototype.requestAddBlockToFrame = function(block) {
  return Object.values(this.frameDB_).reverse().find(function(frame) {
    return frame.requestMoveInBlock(block);
  });
};

/**
 * Add a frame to the list of top frames.
 * @param {!Blockly.Frame} frame Frame to add.
 * @package
 */
Blockly.Workspace.prototype.addTopFrame = function(frame) {
  this.topFrames_.push(frame);

  // Note: If the frame database starts to hold block frames, this may need
  // to move to a separate function.
  if (this.frameDB_[frame.id]) {
    console.warn('Overriding an existing frame on this workspace, with id "' +
        frame.id + '"');
  }
  this.frameDB_[frame.id] = frame;
};

/**
 * Remove a frame from the list of top frames.
 * @param {!Blockly.Frame} frame Frame to remove.
 */
Blockly.Workspace.prototype.removeTopFrame = function(frame) {
  if (!goog.array.remove(this.topFrames_, frame)) {
    throw 'Frame not present in workspace\'s list of top-most frames.';
  }
  
  delete this.frameDB_[frame.id];
};

Blockly.Workspace.prototype.resetFrameAndTopBlocksMap = function() {
  this.topFrames_.forEach(frame => {
    if (!frame.locked) {
      frame.updateOwnedBlocks();
    }
  });
};

/**
 * Finds the top-level frames and returns them.  Frames are optionally sorted
 * by position; top to bottom (with slight LTR or RTL bias).
 * @param {boolean} ordered Sort the list if true.
 * @return {!Array.<!Blockly.Frame>} The top-level frame objects.
 * @package
 */
Blockly.Workspace.prototype.getTopFrames = function(ordered) {
  // Copy the topFrames_ list.
  var frames = [].concat(this.topFrames_);
  if (ordered && frames.length > 1) {
    var offset = Math.sin(goog.math.toRadians(Blockly.Workspace.SCAN_ANGLE));
    if (this.RTL) {
      offset *= -1;
    }
    frames.sort(function(a, b) {
      var aXY = a.getFrameGroupRelativeXY();
      var bXY = b.getFrameGroupRelativeXY();
      return (aXY.y + offset * aXY.x) - (bXY.y + offset * bXY.x);
    });
  }
  return frames;
};

/**
 * Move this frame to the front of the workspace.
 * @param {!Blockly.Frame} frame Frame to move.
 * @package
 */
Blockly.Workspace.prototype.setFrameToFront = function(frame) {
  var index = this.topFrames_.indexOf(frame);
  if(index !== -1) {
    this.topFrames_.splice(index, 1, frame);
    var frameGroup = frame.getSvgRoot();
    frameGroup.parentNode.appendChild(frameGroup);
  }
};

/**
 * Add a block to the list of top blocks.
 * @param {!Blockly.Block} block Block to add.
 */
Blockly.Workspace.prototype.addTopBlock = function(block) {
  this.topBlocks_.push(block);
};

/**
 * Remove a block from the list of top blocks.
 * @param {!Blockly.Block} block Block to remove.
 */
Blockly.Workspace.prototype.removeTopBlock = function(block) {
  if (!goog.array.remove(this.topBlocks_, block)) {
    throw 'Block not present in workspace\'s list of top-most blocks.';
  }
};

/**
 * Finds the top-level blocks and returns them.  Blocks are optionally sorted
 * by position; top to bottom (with slight LTR or RTL bias).
 * @param {boolean} ordered Sort the list if true.
 * @return {!Array.<!Blockly.Block>} The top-level block objects.
 */
Blockly.Workspace.prototype.getTopBlocks = function(ordered) {
  // Copy the topBlocks_ list.
  var blocks = [].concat(this.topBlocks_);
  if (ordered && blocks.length > 1) {
    var offset = Math.sin(goog.math.toRadians(Blockly.Workspace.SCAN_ANGLE));
    if (this.RTL) {
      offset *= -1;
    }
    blocks.sort(function(a, b) {
      var aXY = a.getRelativeToSurfaceXY();
      var bXY = b.getRelativeToSurfaceXY();
      return (aXY.y + offset * aXY.x) - (bXY.y + offset * bXY.x);
    });
  }
  return blocks;
};

/**
 * Add a comment to the list of top comments.
 * @param {!Blockly.WorkspaceComment} comment comment to add.
 * @package
 */
Blockly.Workspace.prototype.addTopComment = function(comment) {
  this.topComments_.push(comment);

  // Note: If the comment database starts to hold block comments, this may need
  // to move to a separate function.
  if (this.commentDB_[comment.id]) {
    console.warn('Overriding an existing comment on this workspace, with id "' +
        comment.id + '"');
  }
  this.commentDB_[comment.id] = comment;
};

/**
 * Remove a comment from the list of top comments.
 * @param {!Blockly.WorkspaceComment} comment comment to remove.
 * @package
 */
Blockly.Workspace.prototype.removeTopComment = function(comment) {
  if (!goog.array.remove(this.topComments_, comment)) {
    throw 'Comment not present in workspace\'s list of top-most comments.';
  }
  // Note: If the comment database starts to hold block comments, this may need
  // to move to a separate function.
  delete this.commentDB_[comment.id];
};

/**
 * Finds the top-level comments and returns them.  Comments are optionally sorted
 * by position; top to bottom (with slight LTR or RTL bias).
 * @param {boolean} ordered Sort the list if true.
 * @return {!Array.<!Blockly.WorkspaceComment>} The top-level comment objects.
 * @package
 */
Blockly.Workspace.prototype.getTopComments = function(ordered) {
  // Copy the topComments_ list.
  var comments = [].concat(this.topComments_);
  if (ordered && comments.length > 1) {
    var offset = Math.sin(goog.math.toRadians(Blockly.Workspace.SCAN_ANGLE));
    if (this.RTL) {
      offset *= -1;
    }
    comments.sort(function(a, b) {
      var aXY = a instanceof Blockly.ScratchBlockComment ? a.getXY() : a.getRelativeToSurfaceXY();
      var bXY = b instanceof Blockly.ScratchBlockComment ? b.getXY() : b.getRelativeToSurfaceXY();
      return (aXY.y + offset * aXY.x) - (bXY.y + offset * bXY.x);
    });
  }
  return comments;
};

/**
 * Find all blocks in workspace.  Blocks are optionally sorted
 * by position; top to bottom (with slight LTR or RTL bias).
 * @param {boolean} ordered Sort the list if true.
 * @return {!Array.<!Blockly.Block>} Array of blocks.
 */
Blockly.Workspace.prototype.getAllBlocks = function(ordered) {
  if (ordered) {
    // Slow, but ordered.
    // This gets all levels of descendants because getDescendants
    // is called recuusively.  They are added to a new list, not the
    // list that it's iterating over.
    var topBlocks = this.getTopBlocks(true);
    var blocks = [];
    for (var i = 0; i < topBlocks.length; i++) {
      blocks.push.apply(blocks, topBlocks[i].getDescendants(true));
    }
  } else {
    // Fast, but in no particular order.
    // This gets all of levels of descendants by always adding to the
    // list that it's iterating over.
    var blocks = this.getTopBlocks(false);
    for (var i = 0; i < blocks.length; i++) {
      blocks.push.apply(blocks, blocks[i].getChildren(false));
    }
  }
  return blocks;
};

/**
 * Dispose of all blocks and comments in workspace.
 */
Blockly.Workspace.prototype.clear = function() {
  this.isClearing = true;
  var existingGroup = Blockly.Events.getGroup();
  if (!existingGroup) {
    Blockly.Events.setGroup(true);
  }
  while (this.topBlocks_.length) {
    this.topBlocks_[0].dispose();
  }
  while (this.topFrames_.length) {
    this.topFrames_[0].dispose();
  }
  while (this.topComments_.length) {
    this.topComments_[this.topComments_.length - 1].dispose();
  }
  if (!existingGroup) {
    Blockly.Events.setGroup(false);
  }
  this.variableMap_.clear();
  this.globalProcedureMap_.clear();
  // Any block with a drop-down or WidgetDiv was disposed.
  if (Blockly.DropDownDiv) {
    Blockly.DropDownDiv.hideWithoutAnimation();
  }
  if (Blockly.WidgetDiv) {
    Blockly.WidgetDiv.hide(true);
  }
  if (this.potentialVariableMap_) {
    this.potentialVariableMap_.clear();
  }
  this.isClearing = false;
};

/* Begin functions that are just pass-throughs to the variable map. */
/**
 * Rename a variable by updating its name in the variable map. Identify the
 * variable to rename with the given ID.
 * @param {string} id ID of the variable to rename.
 * @param {string} newName New variable name.
 * @param {!Boolean} not_fire_event True if the event should not be fired.
 */
Blockly.Workspace.prototype.renameVariableById = function(id, newName, not_fire_event) {
  this.variableMap_.renameVariableById(id, newName, not_fire_event);
};

/**
 * Create a variable with a given name, optional type, and optional ID.
 * @param {!string} name The name of the variable. This must be unique across
 *     each variable type.
 * @param {?string} opt_type The type of the variable like 'int' or 'string'.
 *     Does not need to be unique. Field_variable can filter variables based on
 *     their type. This will default to '' which is a specific type.
 * @param {string=} opt_id The unique ID of the variable. This will default to
 *     a UUID.
 * @param {boolean=} opt_isLocal Whether the variable to create is locally scoped.
 * @param {boolean=} opt_isCloud Whether the variable to create is locally scoped.
 * @return {?Blockly.VariableModel} The newly created variable.
 */
Blockly.Workspace.prototype.createVariable = function(name, opt_type, opt_id,
    opt_isLocal, opt_isCloud) {
  return this.variableMap_.createVariable(name, opt_type, opt_id, opt_isLocal, opt_isCloud);
};

/**
 * Find all the uses of the given variable, which is identified by ID.
 * @param {string} id ID of the variable to find.
 * @return {!Array.<!Blockly.Block>} Array of block usages.
 */
Blockly.Workspace.prototype.getVariableUsesById = function(id) {
  return this.variableMap_.getVariableUsesById(id);
};

/**
 * Delete a variables by the passed in ID and all of its uses from this
 * workspace. May prompt the user for confirmation.
 * @param {string} id ID of variable to delete.
 */
Blockly.Workspace.prototype.deleteVariableById = function(id) {
  this.variableMap_.deleteVariableById(id);
};

/**
 * Force delete a variable from this workspace by the passed
 * in ID. But don't delete if it's used by blocks.
 * @param {string} id ID of variable to delete.
 */
Blockly.Workspace.prototype.forceDeleteVariableById = function(id) {
  this.variableMap_.forceDeleteVariableById(id);
};

/**
 * Deletes a variable and all of its uses from this workspace without asking the
 * user for confirmation.
 * @param {!Blockly.VariableModel} variable Variable to delete.
 * @param {!Array.<!Blockly.Block>} uses An array of uses of the variable.
 * @private
 */
Blockly.Workspace.prototype.deleteVariableInternal_ = function(variable, uses) {
  this.variableMap_.deleteVariableInternal_(variable, uses);
};

/**
 * Check whether a variable exists with the given name.  The check is
 * case-insensitive.
 * @param {string} _name The name to check for.
 * @return {number} The index of the name in the variable list, or -1 if it is
 *     not present.
 * @deprecated April 2017
 */

Blockly.Workspace.prototype.variableIndexOf = function(_name) {
  console.warn(
      'Deprecated call to Blockly.Workspace.prototype.variableIndexOf');
  return -1;
};

/**
 * Find the variable by the given name and return it. Return null if it is not
 *     found.
 * TODO (#1199): Possibly delete this function.
 * @param {!string} name The name to check for.
 * @param {string=} opt_type The type of the variable.  If not provided it
 *     defaults to the empty string, which is a specific type.
 * @return {?Blockly.VariableModel} the variable with the given name.
 */
Blockly.Workspace.prototype.getVariable = function(name, opt_type) {
  return this.variableMap_.getVariable(name, opt_type);
};

/**
 * Find the variable by the given ID and return it. Return null if it is not
 *     found.
 * @param {!string} id The ID to check for.
 * @return {?Blockly.VariableModel} The variable with the given ID.
 */
Blockly.Workspace.prototype.getVariableById = function(id) {
  return this.variableMap_.getVariableById(id);
};

/**
 * Find the variable with the specified type. If type is null, return list of
 *     variables with empty string type.
 * @param {?string} type Type of the variables to find.
 * @return {Array.<Blockly.VariableModel>} The sought after variables of the
 *     passed in type. An empty array if none are found.
 */
Blockly.Workspace.prototype.getVariablesOfType = function(type) {
  return this.variableMap_.getVariablesOfType(type);
};

/**
 * Return all variable types.
 * @return {!Array.<string>} List of variable types.
 * @package
 */
Blockly.Workspace.prototype.getVariableTypes = function() {
  return this.variableMap_.getVariableTypes();
};

/**
 * Return all variables of all types.
 * @return {!Array.<Blockly.VariableModel>} List of variable models.
 */
Blockly.Workspace.prototype.getAllVariables = function() {
  return this.variableMap_.getAllVariables();
};
/* End functions that are just pass-throughs to the variable map. */

/**
 * Create a frame with a given title, id, and blocks.
 * @param {!object} opt_options Dictionary of options.
 * @property {string} id - Use this ID if provided, otherwise
 *     create a new ID.  If the ID conflicts with an in-use ID, a new one will
 *     be generated.
 * @property {Array<string>} blocks - All blocks contained in the frame.
 * @property {number} x - the X coordinate of the workspace's origin.
 * @property {number} y - the Y coordinate of the workspace's origin.
 * @property {number} width - the width of the frame's rect.
 * @property {number} height - the height of the frame's rect.
 * @return {!Blockly.Frame} The newly created frame.
 */
Blockly.Workspace.prototype.createFrame = function(opt_options) {
  var frame = new Blockly.Frame(this, opt_options);
  this.frameDB_[frame.id] = frame;
  return frame;
};

/**
 * Delete a frame and all of its uses from this workspace by the passed
 * in ID. May prompt the user for confirmation.
 * @param {string} id ID of frame to delete.
 * @param {?boolean} retainBlocks Whether to keep blocks or not.
 */
Blockly.Workspace.prototype.deleteFrameById = function(id, retainBlocks) {
  if (this.frameDB_[id]) {
    const frame = this.frameDB_[id];
    delete this.frameDB_[id];
    frame.dispose(retainBlocks);
  }
};

/**
 * Identify the frame to retitle with the given ID.
 * @param {string} id ID of the frame to retitle.
 * @param {string} newTitle New frame title.
 */
Blockly.Workspace.prototype.retitleFrameById = function(id, newTitle) {
  var frame = this.getFrameById(id);
  if (frame) {
    frame.setTitle(newTitle);
  } else {
    console.warn('Could not find frame: ' + id);
  }
};

/**
 * Return all frames of all types.
 * @return {!Array.<Blockly.VariableModel>} List of frame models.
 */
Blockly.Workspace.prototype.getAllFrames = function() {
  return Object.values(this.frameDB_);
};

/** CCW Global Procedures **/

Blockly.Workspace.prototype.createGlobalProcedure = function(mutation) {
  mutation.setAttribute('generateshadows', true);
  this.globalProcedureMap_.createProcedureMutation(mutation);
};

Blockly.Workspace.prototype.getAllGlobalProcedureMutations = function() {
  return this.globalProcedureMap_.getAllProcedureMutations();
};

Blockly.Workspace.prototype.getGlobalProcedureMutationByProccode = function(proccode) {
  return this.globalProcedureMap_.getProcedureMutationByProccode(proccode);
};
/** End **/

/**
 * Returns the horizontal offset of the workspace.
 * Intended for LTR/RTL compatibility in XML.
 * Not relevant for a headless workspace.
 * @return {number} Width.
 */
Blockly.Workspace.prototype.getWidth = function() {
  return 0;
};

/**
 * Obtain a newly created block.
 * @param {?string} prototypeName Name of the language object containing
 *     type-specific functions for this block.
 * @param {string=} opt_id Optional ID.  Use this ID if provided, otherwise
 *     create a new ID.
 * @return {!Blockly.Block} The created block.
 */
Blockly.Workspace.prototype.newBlock = function(prototypeName, opt_id) {
  return new Blockly.Block(this, prototypeName, opt_id);
};

/**
 * Undo or redo the previous action.
 * @param {boolean=} redo False if undo, true if redo.
 */
Blockly.Workspace.prototype.undo = function(redo) {
  var inputStack = redo ? this.redoStack_ : this.undoStack_;
  var outputStack = redo ? this.undoStack_ : this.redoStack_;
  var inputEvent = inputStack.pop();
  if (!inputEvent) {
    return;
  }
  var events = [inputEvent];
  // Do another undo/redo if the next one is of the same group.
  while (inputStack.length && inputEvent.group &&
      inputEvent.group == inputStack[inputStack.length - 1].group) {
    events.push(inputStack.pop());
  }
  // Push these popped events on the opposite stack.
  for (var i = 0, event; event = events[i]; i++) {
    outputStack.push(event);
  }
  events = Blockly.Events.filter(events, redo);
  Blockly.Events.recordUndo = false;
  if (Blockly.selected) {
    Blockly.Events.disable();
    try {
      Blockly.selected.unselect();
    } finally {
      Blockly.Events.enable();
    }
  }
  try {
    for (var i = 0, event; event = events[i]; i++) {
      event.run(redo);
    }
  } finally {
    Blockly.Events.recordUndo = true;
  }
};

/**
 * Clear the undo/redo stacks.
 */
Blockly.Workspace.prototype.clearUndo = function() {
  this.undoStack_.length = 0;
  this.redoStack_.length = 0;
  // Stop any events already in the firing queue from being undoable.
  Blockly.Events.clearPendingUndo();
};

/**
 * @return {boolean} whether there are any events in the redo stack.
 * @package
 */
Blockly.Workspace.prototype.hasRedoStack = function() {
  return this.redoStack_.length != 0;
};

/**
 * @return {boolean} whether there are any events in the undo stack.
 * @package
 */
Blockly.Workspace.prototype.hasUndoStack = function() {
  return this.undoStack_.length != 0;
};
/**
 * When something in this workspace changes, call a function.
 * @param {!Function} func Function to call.
 * @return {!Function} Function that can be passed to
 *     removeChangeListener.
 */
Blockly.Workspace.prototype.addChangeListener = function(func) {
  this.listeners_.push(func);
  return func;
};

/**
 * Stop listening for this workspace's changes.
 * @param {Function} func Function to stop calling.
 */
Blockly.Workspace.prototype.removeChangeListener = function(func) {
  goog.array.remove(this.listeners_, func);
};

/**
 * Fire a change event.
 * @param {!Blockly.Events.Abstract} event Event to fire.
 */
Blockly.Workspace.prototype.fireChangeListener = function(event) {
  if (event.recordUndo) {
    this.undoStack_.push(event);
    this.redoStack_.length = 0;
    if (this.undoStack_.length > this.MAX_UNDO) {
      this.undoStack_.unshift();
    }
  }
  // Copy listeners in case a listener attaches/detaches itself.
  var currentListeners = this.listeners_.slice();
  for (var i = 0, func; func = currentListeners[i]; i++) {
    func(event);
  }
};

/**
 * Find the frame by the given ID and return it. Return null if it is not found.
 * @param {string} id ID of frame to delete.
 * @return {!Blockly.Frame} The frame with the given ID.
 */
Blockly.Workspace.prototype.getFrameById = function(id) {
  return this.frameDB_[id] || null;
};

/**
 * Find the block on this workspace with the specified ID.
 * @param {string} id ID of block to find.
 * @return {Blockly.Block} The sought after block or null if not found.
 */
Blockly.Workspace.prototype.getBlockById = function(id) {
  var block = this.blockDB_[id];
  if (!block && this.getFlyout() && this.getFlyout().getWorkspace()) {
    block = this.getFlyout().getWorkspace().blockDB_[id];
  }
  return block || null;
};

/**
 * Find the comment on this workspace with the specified ID.
 * @param {string} id ID of comment to find.
 * @return {Blockly.WorkspaceComment} The sought after comment or null if not
 *     found.
 * @package
 */
Blockly.Workspace.prototype.getCommentById = function(id) {
  return this.commentDB_[id] || null;
};

/**
 * Getter for the flyout associated with this workspace.  This is null in a
 * non-rendered workspace, but may be overriden by subclasses.
 * @return {Blockly.Flyout} The flyout on this workspace.
 */
Blockly.Workspace.prototype.getFlyout = function() {
  return null;
};

/**
 * Checks whether all value and statement inputs in the workspace are filled
 * with blocks.
 * @param {boolean=} opt_shadowBlocksAreFilled An optional argument controlling
 *     whether shadow blocks are counted as filled. Defaults to true.
 * @return {boolean} True if all inputs are filled, false otherwise.
 */
Blockly.Workspace.prototype.allInputsFilled = function(opt_shadowBlocksAreFilled) {
  var blocks = this.getTopBlocks(false);
  for (var i = 0, block; block = blocks[i]; i++) {
    if (!block.allInputsFilled(opt_shadowBlocksAreFilled)) {
      return false;
    }
  }
  return true;
};

/**
 * Return the variable map that contains "potential" variables.  These exist in
 * the flyout but not in the workspace.
 * @return {?Blockly.VariableMap} The potential variable map.
 * @package
 */
Blockly.Workspace.prototype.getPotentialVariableMap = function() {
  return this.potentialVariableMap_;
};

/**
 * Create and store the potential variable map for this workspace.
 * @package
 */
Blockly.Workspace.prototype.createPotentialVariableMap = function() {
  this.potentialVariableMap_ = new Blockly.VariableMap(this);
};

/**
 * Return the map of all variables on the workspace.
 * @return {?Blockly.VariableMap} The  variable map.
 * @package
 */
Blockly.Workspace.prototype.getVariableMap = function() {
  return this.variableMap_;
};

/**
 * Add a listener into {@link this#deletionListeners_}
 * @param {DeletionCallbackFunc} callback Function that will be triggered on block is deleted
 * @return {DeletionCallbackFunc | undefined} This is what passed in
 *  or undefined if the callback is not a valid function
 */
Blockly.Workspace.prototype.addDeletionListener = function(callback) {
  if (!callback || !(callback instanceof Function)) return;
  this.deletionListeners_.push(callback);
  return callback;
};

/**
 * Remove a listener from {@link this#deletionListeners_}
 * @param {DeletionCallbackFunc} callback Function that is about to be removed from listener list
 * @return {DeletionCallbackFunc} Function that is removed from listener list
 */
Blockly.Workspace.prototype.removeDeletionListener = function(callback) {
  var index = this.deletionListeners_.indexOf(callback);
  if (index !== -1) {
    this.deletionListeners_.splice(index, 1);
  }
  return callback;
};

/**
 * Fire all deletion listeners
 * @param {Blockly.BlockSvg} block Block that was just been removed
 * @param {Function=} undoFunc Function for undo, {@link Blockly.Workspace.undo} will be used if this omitted
 */
Blockly.Workspace.prototype.fireDeletionListeners = function(block, undoFunc) {
  for (var i = 0; i < this.deletionListeners_.length; i++) {
    var func = this.deletionListeners_[i];
    try {
      if (func(block, undoFunc || this.undo.bind(this), this) === true) {
        break;
      }
    } catch (e) {
      console.error('error on firing deletion event for block:', block, ', using func:', func, ', with error:', e);
    }
  }
};

/**
 * Set whether the workspace is disabled or not.
 * @param {boolean} disabled True if disabled.
 */
Blockly.Workspace.prototype.setDisabled = function(disabled) {
  // if (this.disabled != disabled) {
  //   this.disabled = disabled;
  // }
  Blockly.locked = disabled;
};

/**
 * Database of all workspaces.
 * @private
 */
Blockly.Workspace.WorkspaceDB_ = Object.create(null);

/**
 * Find the workspace with the specified ID.
 * @param {string} id ID of workspace to find.
 * @return {Blockly.Workspace} The sought after workspace or null if not found.
 */
Blockly.Workspace.getById = function(id) {
  return Blockly.Workspace.WorkspaceDB_[id] || null;
};

// Export symbols that would otherwise be renamed by Closure compiler.
Blockly.Workspace.prototype['clear'] = Blockly.Workspace.prototype.clear;
Blockly.Workspace.prototype['clearUndo'] =
    Blockly.Workspace.prototype.clearUndo;
Blockly.Workspace.prototype['addChangeListener'] =
    Blockly.Workspace.prototype.addChangeListener;
Blockly.Workspace.prototype['removeChangeListener'] =
    Blockly.Workspace.prototype.removeChangeListener;
