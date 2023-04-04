/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2013 Google Inc.
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

'use strict';

goog.provide('Blockly.Frame');

goog.require('Blockly.Events.FrameCreate');
goog.require('Blockly.Events.FrameDelete');
goog.require('Blockly.Events.FrameRetitle');
goog.require('Blockly.Events.FrameChange');
goog.require('Blockly.Workspace');
goog.require('goog.dom');

/**
 * Class for a frame.
 * @param {!Blockly.Workspace} workspace The block's workspace.
 * @param {!object} opt_options Dictionary of options.
 * @property {string} id - Use this ID if provided, otherwise
 *     create a new ID.  If the ID conflicts with an in-use ID, a new one will
 *     be generated.
 * @property {Array<string>} blocks - All blocks contained in the frame.
 * @property {number} x - the X coordinate of the workspace's origin.
 * @property {number} y - the Y coordinate of the workspace's origin.
 * @property {number} width - the width of the frame's rect.
 * @property {number} height - the height of the frame's rect.
 * @constructor
 */
Blockly.Frame = function(workspace, opt_options) {
  this.workspace = workspace;

  this.options = opt_options || {
    title: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };

  /** @type {boolean} */
  this.RTL = workspace.RTL;

  /**
   * The ID of the frame
   */
  this.id = this.options.id ? this.options.id : Blockly.utils.genUid();

  /**
   * @type {boolean}
   * @private
   */
  this.editable_ = true;
  
  /**
   * The frame's title
   */
  this.title = this.options.title || Blockly.Msg.FRAME;


  /**
   * The event that most recently updated this gesture.
   * @type {Event}
   * @private
   */
  this.mostRecentEvent_ = null;

  
  this.rect_ = {
    width: this.options.width,
    height: this.options.height,
    left: this.options.x,
    top: this.options.y,
    right: this.options.x + this.options.width,
    bottom: this.options.y + this.options.height
  };
  
  this.oldBoundingFrameRect_ = this.getBoundingFrameRect();

  /**
   * The contained blocks.
   * @private
   */
  this.blockDB_ = {};

  this.resizeButtons = {
    tl: null,
    tr: null,
    bl: null,
    br: null,
  };

  workspace.addTopFrame(this);

  this.createDom_();

  if (this.options.blocks) {
    setTimeout(() => {
      this.initIncludeBlocks();
    });
  }

  Blockly.Events.fire(new Blockly.Events.FrameCreate(this));
};

/**
 * The title of the frame.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.title = '';

/**
 * Minimum width of the frame.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.minWidth_ = 20;

/**
 * Minimum width of the frame.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.minHeight_ = 20;

/**
 * the width of the resize button.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.resizeButtonWidth_ = 10;

/**
 * the height of the resize button.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.resizeButtonHeight_ = 10;

/**
 * the height of the title textarea.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.titleTextTextareaHeight_ = 20;

/**
 * The frame border color.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.borderColor_ = 'var(--theme-brand-color, #2D8CFF)';

/**
 * Called before the frame is successfully created。
 */
Blockly.Frame.prototype.beforeCreateSuccess = function() {
  if(this.getWidth() < 2 && this.getHeight() < 2) {
    this.dispose();
  } else {
    this.checkRect_();
    this.createResizeGroup_();
    this.updateResizeButtonsPosition();
    this.updateOwnedBlocks();
    this.fireFrameRectChange();
    this.workspace.onFrameCreationComplete();
  }
  this.onStopResizeRect_();
};

/**
 * Move this frame to the front of the workspace.
 * <g> tags do not respect z-index so SVG renders them in the
 * order that they are in the DOM.  By placing this frame first within the
 * frame group's <g>.
 * @package
 */
Blockly.Frame.prototype.bringToFront = function() {
  var frame = this.getSvgRoot();
  frame.parentNode.appendChild(frame);
};

/**
 * Check whether the identifiers need to be adjusted after resize。
 */
Blockly.Frame.prototype.checkRect_ = function() {
  if(this.rect_.right < this.rect_.left) {
    this.rect_.width = Math.abs(this.rect_.width);
    var temp = this.rect_.right;
    this.rect_.right = this.rect_.left;
    this.rect_.left = temp;
  }
  if(this.rect_.bottom < this.rect_.top) {
    this.rect_.height = Math.abs(this.rect_.height);
    var temp = this.rect_.top;
    this.rect_.top = this.rect_.bottom;
    this.rect_.bottom = temp;
  }
};

/**
 * Create the frame's DOM.
 * @private
 */
Blockly.Frame.prototype.createDom_ = function() {
  /** @type {SVGElement} */
  this.frameGroup_ = Blockly.utils.createSvgElement('g',
      {
        'class': 'blocklyFrame',
      }, this.workspace.svgBlockCanvas_);
  // Expose this block's ID on its top-level SVG group.
  if (this.frameGroup_.dataset) {
    this.frameGroup_.dataset.id = this.id;
  }
  this.translateFrameGroup();
  var tx = this.resizeButtonWidth_ / 2;
  var ty = this.titleTextTextareaHeight_ + this.resizeButtonHeight_ / 2;
  /** @type {SVGElement} */
  this.blocksGroup_ = Blockly.utils.createSvgElement('g',
      {
        'class': 'blocklyFrameBlockCanvas',
        'transform': 'translate(' + tx + ',' + ty + ')',
      }, this.frameGroup_);
  this.translateFrameGroup();

  /** @type {SVGElement} */
  this.svgRect_ = Blockly.utils.createSvgElement('rect',
      {
        'stroke': this.borderColor_,
        'fill': 'var(--theme-color-400, rgba(0,0,0,0.3))',
        'x': 0 ,
        'y': 0,
        'height': this.rect_.height,
        'width': this.rect_.width
      },
      this.blocksGroup_);
  Blockly.bindEventWithChecks_(
      this.svgRect_, 'mousedown', null, this.onRectMouseDown_.bind(this));

  this.createTitleEditor_();
};

/**
 * Create the editor for the frame's title.
 * @private
 */
Blockly.Frame.prototype.createTitleEditor_ = function() {
  this.foreignObject_ = Blockly.utils.createSvgElement('foreignObject', {
    'x': this.resizeButtonWidth_ / 2, 'y': 0, height: 0, width: 0
  }, this.frameGroup_);
  this.onStartResizeRect_();
  var body = document.createElementNS(Blockly.HTML_NS, 'body');
  body.setAttribute('xmlns', Blockly.HTML_NS);
  body.className = 'blocklyMinimalBody blocklyFrameTitleBody';
  var textarea = document.createElementNS(Blockly.HTML_NS, 'textarea');
  textarea.className = 'blocklyFrameTitleTextarea';
  textarea.value = this.title;
  textarea.setAttribute('dir', this.workspace.RTL ? 'RTL' : 'LTR');
  body.appendChild(textarea);
  this.textarea_ = textarea;
  this.foreignObject_.appendChild(body);
  // Don't zoom with mousewheel.
  Blockly.bindEventWithChecks_(textarea, 'wheel', this, function(e) {
    e.stopPropagation();
  });
  Blockly.bindEventWithChecks_(textarea, 'change', this, function(_e) {
    if (this.title != textarea.value) {
      this.updateTitle(textarea.value);
    }
  });
  this.updateTitleBoxSize();
};

/**
 * Create the resize group.
 * @return {!Element} The resize group.
 * @private
 */
Blockly.Frame.prototype.createResizeGroup_ = function() {
  /** @type {SVGElement} */
  this.resizeGroup_ = Blockly.utils.createSvgElement('g', {
    'class': 'frameResizeButtons'
  },  this.frameGroup_);
  // top left corner
  this.resizeButtons.tl = Blockly.utils.createSvgElement('rect', {
    'class': 'blocklyResizeButtonNW',
    'stroke': this.borderColor_,
    'fill': 'var(--theme-text-primary, #FFFFFF)',
    'x': '0',
    'y': this.titleTextTextareaHeight_,
    'height': this.resizeButtonHeight_,
    'width': this.resizeButtonWidth_
  }, this.resizeGroup_);
  Blockly.bindEventWithChecks_(this.resizeButtons.tl, 'mousedown', null,  this.resizeButtonMouseDown_.bind(this, 'tl'));
  // top right corner
  this.resizeButtons.tr = Blockly.utils.createSvgElement('rect', {
    'class': 'blocklyResizeButtonNE',
    'stroke': this.borderColor_,
    'fill': 'var(--theme-text-primary, #FFFFFF)',
    'x': this.resizeButtonWidth_,
    'y': this.titleTextTextareaHeight_,
    'height': this.resizeButtonHeight_,
    'width': this.resizeButtonWidth_
  }, this.resizeGroup_);
  Blockly.bindEventWithChecks_(this.resizeButtons.tr, 'mousedown', null,  this.resizeButtonMouseDown_.bind(this, 'tr'));
  // bottom left corner
  this.resizeButtons.bl = Blockly.utils.createSvgElement('rect', {
    'class': 'blocklyResizeButtonSW',
    'stroke': this.borderColor_,
    'fill': 'var(--theme-text-primary, #FFFFFF)',
    'x': '0',
    'y': this.resizeButtonHeight_ + this.titleTextTextareaHeight_,
    'height': this.resizeButtonHeight_,
    'width': this.resizeButtonWidth_
  }, this.resizeGroup_);
  Blockly.bindEventWithChecks_(this.resizeButtons.bl, 'mousedown', null,  this.resizeButtonMouseDown_.bind(this, 'bl'));
  // bottom right corner
  this.resizeButtons.br = Blockly.utils.createSvgElement('rect', {
    'class': 'blocklyResizeButtonSE',
    'stroke': this.borderColor_,
    'fill': 'var(--theme-text-primary, #FFFFFF)',
    'x': this.resizeButtonWidth_,
    'y': this.resizeButtonHeight_ + this.titleTextTextareaHeight_,
    'height': this.resizeButtonHeight_,
    'width': this.resizeButtonWidth_
  }, this.resizeGroup_);
  Blockly.bindEventWithChecks_(this.resizeButtons.br, 'mousedown', null,  this.resizeButtonMouseDown_.bind(this, 'br'));
  return this.resizeGroup_;
};

Blockly.Frame.prototype.fireFrameRectChange = function() {
  Blockly.Events.fire(new Blockly.Events.FrameChange(this, this.oldBoundingFrameRect_, this.getBoundingFrameRect()));
};

/**
 * Returns the coordinates of a bounding box describing the dimensions of this
 * frame and any frames stacked below it.
 * Coordinate system: workspace coordinates.
 * @return {!{topLeft: goog.math.Coordinate, bottomRight: goog.math.Coordinate}}
 *    Object with top left and bottom right coordinates of the bounding box.
 */
Blockly.Frame.prototype.getBoundingRectangle = function() {
  var frame = this.getRelativeToSurfaceXY(true);
  var width = this.getWidth();
  var height = this.getHeight();
  var topLeft;
  var bottomRight;
  if (this.RTL) {
    topLeft = new goog.math.Coordinate(frame.x - width,
        frame.y);
    bottomRight = new goog.math.Coordinate(frame.x,
        frame.y + height);
  } else {
    topLeft = new goog.math.Coordinate(frame.x, frame.y);
    bottomRight = new goog.math.Coordinate(frame.x + width,
        frame.y + height);
  }

  return {topLeft: topLeft, bottomRight: bottomRight};
};

/**
 * Return the coordinates of the top-left corner of this frame relative to the
 * drawing surface's origin (0,0), in workspace units.
 * If the frame is on the workspace, (0, 0) is the origin of the workspace
 * coordinate system.
 * This does not change with workspace scale.
 * @return {!goog.math.Coordinate} Object with .x and .y properties in
 *     workspace coordinates.
 */
Blockly.Frame.prototype.getRelativeToSurfaceXY = function() {
  return Blockly.utils.getRelativeXY(this.frameGroup_);
};

/**
 * Return the coordinates of the top-left corner of this block group relative to the
 * workspace origin (0,0), in workspace units.
 * If the frame is on the workspace, (0, 0) is the origin of the workspace coordinate system.
 * This does not change with workspace scale.
 * @return {!goog.math.Coordinate} Object with .x and .y properties in
 *     workspace coordinates.
 */
Blockly.Frame.prototype.getBlockGroupRelativeXY = function() {
  var frameXY = Blockly.utils.getRelativeXY(this.frameGroup_);
  var blocksGroupXY = Blockly.utils.getRelativeXY(this.blocksGroup_);
  return new goog.math.Coordinate(frameXY.x + blocksGroupXY.x, frameXY.y + blocksGroupXY.y);
};

/**
 * Return the root node of the SVG or null if none exists.
 * @return {Element} The root SVG node (probably a group).
 */
Blockly.Frame.prototype.getSvgRoot = function() {
  return this.frameGroup_;
};

/**
 * Get the width of the frame.
 * @return {number} The width of the flyout.
 */
Blockly.Frame.prototype.getWidth = function() {
  return Math.abs(this.rect_.right - this.rect_.left);
};

/**
 * Get the height of the frame.
 * @return {number} The width of the flyout.
 */
Blockly.Frame.prototype.getHeight = function() {
  return Math.abs(this.rect_.bottom - this.rect_.top);
};

Blockly.Frame.prototype.getBoundingFrameRect = function() {
  return {
    x: this.rect_.left - this.resizeButtonWidth_ / 2,
    y: this.rect_.top - (this.titleTextTextareaHeight_ + this.resizeButtonHeight_ / 2),
    width: this.getWidth(),
    height: this.getHeight()
  };
};

Blockly.Frame.prototype.getIncludeBlocks = function() {
  return Object.keys(this.blockDB_);
};

Blockly.Frame.prototype.initIncludeBlocks = function() {
  this.options.blocks.forEach((blockId) => {
    var block = this.workspace.getBlockById(blockId);
    if (block) {
      block.requestMoveInFrame();
    }
  });
};

/**
 * Get whether this frame is editable or not.
 * @return {boolean} True if editable.
 */
Blockly.Frame.prototype.isEditable = function() {
  return this.editable_ && !(this.workspace && this.workspace.options.readOnly);
};

/**
 * Move this frame during a drag, taking into account whether we are using a
 * drag surface to translate frame.
 * @param {!goog.math.Coordinate} newLoc The location to translate to, in
 *     workspace coordinates.
 * @package
 */
Blockly.Frame.prototype.moveDuringDrag = function(newLoc) {
  this.rect_.left = newLoc.x + this.resizeButtonWidth_ / 2;
  this.rect_.top = newLoc.y + this.resizeButtonHeight_ / 2 + this.titleTextTextareaHeight_;
  this.rect_.right = this.rect_.left + this.rect_.width + this.resizeButtonWidth_ / 2;
  this.rect_.bottom = this.rect_.top + this.rect_.height + this.resizeButtonWidth_ / 2;
  this.translateFrameGroup();
};

Blockly.Frame.prototype.addBlock = function(block) {
  var oldBlocks = this.getIncludeBlocks();
  this.blockDB_[block.id] = block;
  Blockly.Events.fire(new Blockly.Events.FrameChange(this, {blocks: oldBlocks}, {blocks: this.getIncludeBlocks()}));
};
  
Blockly.Frame.prototype.removeBlock = function(block) {
  var oldBlocks = this.getIncludeBlocks();
  delete this.blockDB_[block.id];
  Blockly.Events.fire(new Blockly.Events.FrameChange(this, {blocks: oldBlocks}, {blocks: this.getIncludeBlocks()}));
};

/**
 * Handle resize the frame's rect.
 * @param {!Event} e Mouse down event or touch start event.
 * @private
 */
Blockly.Frame.prototype.onStartResizeRect_ = function() {
  this.foreignObject_.style['pointer-events'] = 'none';
};

Blockly.Frame.prototype.onStopResizeRect_ = function() {
  this.foreignObject_.style['pointer-events'] = 'auto';
};

/**
 * Handle a mouse-down on an frame's rect.
 * @param {!Event} e Mouse down event or touch start event.
 * @private
 */
Blockly.Frame.prototype.onRectMouseDown_ = function(e) {
  if (this.workspace.createFrameOnNextMouseDown) {
    this.workspace.onFrameCreationComplete();
    e.stopPropagation();
  }
  var gesture = this.workspace && this.workspace.getGesture(e);
  if (gesture) {
    gesture.handleFrameStart(e, this);
  }
};

/**
 * Create the resize group.
 * @param {String} dir The direction of the button.
 * @param {!Event} e Mouse down event or touch start event.
 * @private
 */
Blockly.Frame.prototype.resizeButtonMouseDown_ = function(dir, e) {
  this.mostRecentEvent_ = e;
  this.oldBoundingFrameRect_ = this.getBoundingFrameRect();
  this.onStartResizeRect_();
  this.resizeButtonMouseMoveBindData_ =
    Blockly.bindEventWithChecks_(document, 'mousemove', null,  this.resizeButtonMouseMove_.bind(this, dir));
  this.resizeButtonMouseUpBindData_ =
    Blockly.bindEventWithChecks_(document, 'mouseup', null,  this.resizeButtonMouseUp_.bind(this, dir));
  
  e.preventDefault();
  e.stopPropagation();
};

/**
 * Create the resize group.
 * @param {String} dir The direction of the button.
 * @param {!Event} e Mouse down event or touch start event.
 * @private
 */
Blockly.Frame.prototype.resizeButtonMouseMove_ = function(dir, e) {
  var diffX = (e.offsetX - this.mostRecentEvent_.offsetX) / this.workspace.scale;
  var diffY = (e.offsetY - this.mostRecentEvent_.offsetY) / this.workspace.scale;
  this.mostRecentEvent_ = e;
  var xDir = dir === 'tr' || dir === 'br' ? 'ltr' : 'rtl';
  var yDir = dir === 'tl' || dir === 'tr' ? 'btt' : 'ttb';
  this.updateBoundingClientRect(diffX, diffY, xDir, yDir);
  this.translateFrameGroup();
  this.updateFrameRectSize();
  this.updateTitleBoxSize();
  this.updateResizeButtonsPosition();
};

/**
 * Create the resize group.
 * @param {String} dir The direction of the button.
 * @param {!Event} e Mouse down event or touch start event.
 * @private
 */
Blockly.Frame.prototype.resizeButtonMouseUp_ = function(dir, e) {
  this.resizeButtonMouseMove_(dir,e);
  this.checkRect_();
  this.updateOwnedBlocks();
  this.onStopResizeRect_();
  this.fireFrameRectChange();
  Blockly.unbindEvent_(this.resizeButtonMouseMoveBindData_);
  Blockly.unbindEvent_(this.resizeButtonMouseUpBindData_);
};

/**
 * If a block is within the range of the frame, it can be collected..
 * @param {Blockly.BlockSvg} block Mouse down event or touch start event.
 * @return {boolean} true if the block was successfully added.
 */
Blockly.Frame.prototype.requestMoveInBlock = function(block) {
  const {x,y} = Blockly.utils.getRelativeXY(block.svgGroup_);
  const {left, right, top, bottom, width, height} = this.rect_;
  let removeAble = false;
  if (block.frame_ === this) {
    removeAble = x < width && y < height;
  } else if (block.frame_ && block.frame_ !== this) {
    removeAble = false;
  } else if (x > left && x < right && y > top && y < bottom) {
    removeAble = true;
  }
  if(removeAble) {
    this.addBlock(block);
  }
  return removeAble;
};

Blockly.Frame.prototype.resizeMouseDown_ = function(e) {
  this.mostRecentEvent_ = e;
  var wsRelativeXY = Blockly.utils.getRelativeXY(this.workspace.svgBlockCanvas_);
  this.rect_.left = this.rect_.right = (e.offsetX - wsRelativeXY.x) / this.workspace.scale;
  this.rect_.top = this.rect_.bottom = (e.offsetY - wsRelativeXY.y) / this.workspace.scale;
};

Blockly.Frame.prototype.resizeMouseMove_ = function(dir, e) {
  var diffX = (e.offsetX - this.mostRecentEvent_.offsetX) / this.workspace.scale;
  var diffY = (e.offsetY - this.mostRecentEvent_.offsetY) / this.workspace.scale;
  this.mostRecentEvent_ = e;
  var xDir = dir === 'tr' || dir === 'br' ? 'ltr' : 'rtl';
  var yDir = dir === 'tl' || dir === 'tr' ? 'btt' : 'ttb';
  this.updateBoundingClientRect(diffX, diffY, xDir, yDir);
  this.translateFrameGroup();
  this.updateFrameRectSize();
  this.updateTitleBoxSize();
};

/**
 * Recursively adds or removes the dragging class to this node.
 * @param {boolean} adding True if adding, false if removing.
 * @package
 */
Blockly.Frame.prototype.setDragging = function(adding) {
  if (adding) {
    this.oldBoundingFrameRect_ = this.getBoundingFrameRect();
    var group = this.getSvgRoot();
    group.translate_ = '';
    group.skew_ = '';
    Blockly.utils.addClass(
        /** @type {!Element} */ (this.frameGroup_), 'blocklyDragging');
    this.onStartResizeRect_();
  } else {
    Blockly.utils.removeClass(
        /** @type {!Element} */ (this.frameGroup_), 'blocklyDragging');
    this.onStopResizeRect_();
  }
};

/**
 * Set whether this frame is editable or not.
 * @param {boolean} editable True if editable.
 */
Blockly.Frame.prototype.setEditable = function(editable) {
  this.editable_ = editable;
};

/**
 * Update the cursor over this frame by adding or removing a class.
 * @param {boolean} letMouseThrough True if the frame should ignore pointer
 *     events, false otherwise.
 * @package
 */
Blockly.Frame.prototype.setMouseThroughStyle = function(letMouseThrough) {
  if (letMouseThrough) {
    Blockly.utils.addClass(/** @type {!Element} */ (this.frameGroup_),
        'blocklyDraggingMouseThrough');
  } else {
    Blockly.utils.removeClass(/** @type {!Element} */ (this.frameGroup_),
        'blocklyDraggingMouseThrough');
  }
};

/**
 * Show the context menu for this frame.
 * @param {!Event} e Mouse event.
 * @private
 */
Blockly.Frame.prototype.showContextMenu_ = function(e) {
  if (this.workspace.options.readOnly) {
    return;
  }
  // Save the current block in a variable for use in closures.
  var block = this;
  var menuOptions = [];
  if (this.isEditable()) {
    menuOptions.push(Blockly.ContextMenu.frameDeleteOption(block, e));
  }
  Blockly.ContextMenu.show(e, menuOptions, this.RTL);
  Blockly.ContextMenu.currentFrame = this;
};

/**
 * Transforms a frame group.
 * @private
 */
Blockly.Frame.prototype.translateFrameGroup = function() {
  var rx = this.rect_.left < this.rect_.right ? this.rect_.left : this.rect_.right;
  var ry = this.rect_.top < this.rect_.bottom ? this.rect_.top : this.rect_.bottom;
  var tx = rx - this.resizeButtonWidth_ / 2;
  var ty = ry - this.resizeButtonHeight_ / 2 - this.titleTextTextareaHeight_;
  this.frameGroup_.setAttribute('transform', `translate(${tx},${ty})`);
};

Blockly.Frame.prototype.updateFrameRectSize = function() {
  this.svgRect_.setAttribute("width", Math.abs(this.rect_.width));
  this.svgRect_.setAttribute("height", Math.abs(this.rect_.height));
};

Blockly.Frame.prototype.updateTitle = function(newTitle) {
  Blockly.Events.fire(new Blockly.Events.FrameRetitle(this, newTitle));
  this.title = newTitle;
};

Blockly.Frame.prototype.updateTitleBoxSize = function() {
  if(this.foreignObject_) {
    this.foreignObject_.setAttribute("height", 20);
    this.foreignObject_.setAttribute("width", this.getWidth());
  }
};

/**
 * Update the owned blocks
 */
Blockly.Frame.prototype.updateOwnedBlocks = function() {
  var oldBlocks = this.blockDB_;
  this.blockDB_ = {};
  const allTopBlocks = this.workspace.getTopBlocks();
  for (let index = 0; index < allTopBlocks.length; index++) {
    allTopBlocks[index].requestMoveInFrame();
  }
  Object.values(oldBlocks).forEach((block) => {
    if(!this.blockDB_[block.id]) {
      block.requestMoveOutFrame();
    }
  });
};

/**
 * Update the most recent frame group size and position
 * @param {Number} diffX The new size change in the x direction
 * @param {Number} diffY The new size change in the y direction
 * @param {String} xDir On the X-axis, from left to right or right to left
 * @param {String} yDir On the Y-axis, from top to bottom or from bottom to top
 */
Blockly.Frame.prototype.updateBoundingClientRect = function(diffX, diffY, xDir, yDir) {
  // Left to right
  if (xDir === 'ltr') {
    this.rect_.right += diffX;
    this.rect_.width += diffX;
  } else {
    this.rect_.left += diffX;
    this.rect_.width -= diffX;
  }
  // Top to bottom
  if (yDir === 'ttb') {
    this.rect_.bottom += diffY;
    this.rect_.height += diffY;
  } else {
    this.rect_.top += diffY;
    this.rect_.height -= diffY;
  }
};

/**
 * Update all resize button position.
 */
Blockly.Frame.prototype.updateResizeButtonsPosition = function() {
  this.resizeButtons.tr.setAttribute('x', this.getWidth());
  this.resizeButtons.bl.setAttribute('y', this.getHeight() + this.titleTextTextareaHeight_);
  this.resizeButtons.br.setAttribute('x', this.getWidth());
  this.resizeButtons.br.setAttribute('y', this.getHeight() + this.titleTextTextareaHeight_);
};

/**
 * Dispose of this frame.
 */
Blockly.Frame.prototype.dispose = function() {
  if (!this.workspace) {
    // The frame has already been deleted.
    return;
  }

  for (const key in this.blockDB_) {
    if (Object.hasOwnProperty.call(this.blockDB_, key)) {
      const block = this.blockDB_[key];
      block.dispose();
    }
  }

  Blockly.Events.fire(new Blockly.Events.FrameDelete(this));

  goog.dom.removeNode(this.frameGroup_);
  this.frameGroup_ = null;
  this.blockDB_ = null;
  this.rect_ = null;
  this.svgRect_ = null;

  // Remove from the list of top frames and the frame database.
  this.workspace.removeTopFrame(this);
  this.workspace = null;
};
