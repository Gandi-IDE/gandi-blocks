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
 * The Frame rect state
 * @typedef {object} FrameRectState
 * @property {number} x - the X coordinate of the workspace's origin.
 * @property {number} y - the Y coordinate of the workspace's origin.
 * @property {number} width - the width of the frame's rect.
 * @property {number} height - the height of the frame's rect.
 */

/**
 * Class for a frame.
 * @param {!Blockly.Workspace} workspace The block's workspace.
 * @param {!NumberLike} opt_options Dictionary of options.
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
  /** @type {!Blockly.Workspace} */
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
   * @type {boolean}
   * @private
   */
  this.deletable_ = true;
  
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

  /** @type {boolean} */
  this.rendered = false;

  
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

  this.oldBlocksCoordinate_ = {};

  this.resizeButtons = {
    tl: null,
    tr: null,
    bl: null,
    br: null,
  };

  this.createDom_();

  if (this.options.blocks) {
    setTimeout(() => {
      this.appendBlocksToBlocksCanvas();
    });
  }

  workspace.addTopFrame(this);

  if (opt_options && opt_options.id) {
    this.rendered = true;
    Blockly.Events.setGroup(true);
    Blockly.Events.fire(new Blockly.Events.FrameCreate(this));
  }
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
 * The width of the resize button.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.resizeButtonWidth_ = 10;

/**
 * The height of the resize button.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.resizeButtonHeight_ = 10;

/**
 * The min height of the title textarea.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.titleTextTextareaMinHeight_ = 20;

/**
 * The height of the title textarea.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.titleTextareaHeight_ = 20;

/**
 * The frame border color.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.borderColor_ = 'var(--theme-brand-color, #2D8CFF)';

/**
 * Append blocks belonging to the node to the blocklyFrameBlockCanvas node below.
 */
Blockly.Frame.prototype.appendBlocksToBlocksCanvas = function() {
  this.options.blocks.forEach((blockId) => {
    var block = this.workspace.getBlockById(blockId);
    if (block) {
      block.frame_ = this;
      block.requestMoveInFrame();
    }
  });
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
 * @private
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
  var tx = this.resizeButtonWidth_ / 2;
  var ty = this.titleTextareaHeight_ + this.resizeButtonHeight_ / 2;
  /** @type {SVGElement} */
  this.blocksGroup_ = Blockly.utils.createSvgElement('g',
      {
        'class': 'blocklyFrameBlockCanvas',
        'transform': 'translate(' + tx + ',' + ty + ')',
      }, this.frameGroup_);
  var xy = this.computeFrameRelativeXY();
  this.translate(xy.x, xy.y - this.titleTextareaHeight_);

  /** @type {SVGElement} */
  this.svgRect_ = Blockly.utils.createSvgElement('rect',
      {
        'class': 'blocklyFrameRectangle',
        'stroke': 'transparent',
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
  this.createResizeGroup_();
};

/**
 * Create the editor for the frame's title.
 * @private
 */
Blockly.Frame.prototype.createTitleEditor_ = function() {
  this.foreignObject_ = Blockly.utils.createSvgElement('foreignObject', {
    'x': this.resizeButtonWidth_ / 2, 'y': 0, height: 0, width: 0
  }, this.frameGroup_);
  var body = document.createElementNS(Blockly.HTML_NS, 'body');
  body.setAttribute('xmlns', Blockly.HTML_NS);
  body.className = 'blocklyMinimalBody blocklyFrameTitleBody';
  var textarea = document.createElementNS(Blockly.HTML_NS, 'textarea');
  textarea.className = 'blocklyFrameTitleTextarea';
  textarea.value = this.title;
  textarea.setAttribute('dir', this.workspace.RTL ? 'RTL' : 'LTR');
  textarea.setAttribute('maxlength', 1000);
  body.appendChild(textarea);
  this.textarea_ = textarea;
  this.foreignObject_.appendChild(body);
  setTimeout(() => {
    if (this.title !== Blockly.Msg.FRAME) {
      var newHeight = this.textarea_.scrollHeight;
      this.textarea_.style.height = newHeight + 'px';
      this.onTitleTextareaHeightChange(newHeight);
    }
  });
  // Don't zoom with mousewheel.
  Blockly.bindEventWithChecks_(textarea, 'wheel', this, function(e) {
    e.stopPropagation();
  });
  Blockly.bindEventWithChecks_(textarea, 'input', this, function() {
    this.onTitleTextareaHeightChange();
  });
  Blockly.bindEventWithChecks_(textarea, 'change', this, function() {
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
  var tx = 0;
  var ty = this.titleTextareaHeight_;
  /** @type {SVGElement} */
  this.resizeGroup_ = Blockly.utils.createSvgElement('g', {
    'class': 'frameResizeButtons',
    'transform': 'translate(' + tx + ',' + ty + ')',
  },  this.frameGroup_);
  // top left corner
  this.resizeButtons.tl = Blockly.utils.createSvgElement('rect', {
    'class': 'blocklyResizeButtonNW',
    'stroke': this.borderColor_,
    'fill': 'var(--theme-text-primary, #FFFFFF)',
    'x': '0',
    'y': '0',
    'height': this.resizeButtonHeight_,
    'width': this.resizeButtonWidth_
  }, this.resizeGroup_);
  Blockly.bindEventWithChecks_(this.resizeButtons.tl, 'mousedown', null,  this.resizeButtonMouseDown_.bind(this, 'tl'));
  // top right corner
  this.resizeButtons.tr = Blockly.utils.createSvgElement('rect', {
    'class': 'blocklyResizeButtonNE',
    'stroke': this.borderColor_,
    'fill': 'var(--theme-text-primary, #FFFFFF)',
    'x': this.getWidth(),
    'y': '0',
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
    'y': this.getHeight(),
    'height': this.resizeButtonHeight_,
    'width': this.resizeButtonWidth_
  }, this.resizeGroup_);
  Blockly.bindEventWithChecks_(this.resizeButtons.bl, 'mousedown', null,  this.resizeButtonMouseDown_.bind(this, 'bl'));
  // bottom right corner
  this.resizeButtons.br = Blockly.utils.createSvgElement('rect', {
    'class': 'blocklyResizeButtonSE',
    'stroke': this.borderColor_,
    'fill': 'var(--theme-text-primary, #FFFFFF)',
    'x': this.getWidth(),
    'y': this.getHeight(),
    'height': this.resizeButtonHeight_,
    'width': this.resizeButtonWidth_
  }, this.resizeGroup_);
  Blockly.bindEventWithChecks_(this.resizeButtons.br, 'mousedown', null,  this.resizeButtonMouseDown_.bind(this, 'br'));
  return this.resizeGroup_;
};

/**
 * Clean up the frame by ordering all the blocks in a column.
 */
Blockly.Frame.prototype.cleanUp = function() {
  this.workspace.setResizesEnabled(false);
  if (!Blockly.Events.getGroup()) {
    Blockly.Events.setGroup(true);
  }
  var blocks = Object.values(this.blockDB_);
  var height = 10;
  var width = 0;
  for (var i = 0, block; block = blocks[i]; i++) {
    if (block.hidden) {
      continue;
    }
    var xy = block.getRelativeToSurfaceXY(true);
    block.moveBy(-xy.x + 10, height - xy.y, true);
    block.snapToGrid();
    var blockHeightWidth = block.getHeightWidth();
    width = Math.max(width, blockHeightWidth.width + 20);
    height = block.getRelativeToSurfaceXY(true).y + blockHeightWidth.height
      + Blockly.BlockSvg.MIN_BLOCK_Y;
  }

  this.render({
    x: this.rect_.left - this.resizeButtonWidth_ / 2,
    y: this.rect_.top - (this.titleTextareaHeight_ + this.resizeButtonHeight_ / 2),
    height: height,
    width: width
  });

  Blockly.Events.setGroup(false);
  this.workspace.setResizesEnabled(true);
};

/**
 * Return the coordinates of the top-left corner of this frame relative to the
 * workspace's origin (0,0).
 * @return {!goog.math.Coordinate} Object with .x and .y properties in
 *     workspace coordinates.
 */
Blockly.Frame.prototype.computeFrameRelativeXY = function() {
  var rx = this.rect_.left < this.rect_.right ? this.rect_.left : this.rect_.right;
  var ry = this.rect_.top < this.rect_.bottom ? this.rect_.top : this.rect_.bottom;
  var x = rx - this.resizeButtonWidth_ / 2;
  var y = ry - this.resizeButtonHeight_ / 2;
  return new goog.math.Coordinate(x, y);
};

/**
 * Fire an event when the frame changes rectangle dimensions or changes blocks.
 * @param {?string} element One of 'rect', 'blocks', 'disabled', etc.
 * @param {?boolean} oldValue oldValue Previous value of element.
 * @param {?boolean} newValue New value of element.
 * @private
 */
Blockly.Frame.prototype.fireFrameChange = function(element, oldValue, newValue) {
  Blockly.Events.fire(new Blockly.Events.FrameChange(this, element, oldValue, newValue));
};

/**
 * Fire an event when the frame changes rectangle dimensions or positions.
 */
Blockly.Frame.prototype.fireFrameRectChange = function() {
  var eventsEnabled = Blockly.Events.isEnabled();
  if (eventsEnabled) {
    this.fireFrameChange('rect', this.oldBoundingFrameRect_, this.getBoundingFrameRect());
    // When the position of a Frame changes, it needs to update the position information of the blocks it contains.
    for (const key in this.blockDB_) {
      if (Object.hasOwnProperty.call(this.blockDB_, key)) {
        var block = this.blockDB_[key];
        var event = new Blockly.Events.BlockMove(block);
        event.oldCoordinate = this.oldBlocksCoordinate_[block.id];
        event.recordNew();
        Blockly.Events.fire(event);
      }
    }
    this.oldBlocksCoordinate_ = {};
  }
};

/**
 * Fire an event when the frame changes blocks.
 */
Blockly.Frame.prototype.fireFrameBlocksChange = function() {
  var eventsEnabled = Blockly.Events.isEnabled();
  if (eventsEnabled) {
    this.fireFrameChange('blocks', {blocks: this.oldBlockIdList_} , {blocks: this.getBlockIds()});
  }
};

/**
 * Returns the coordinates of a bounding box describing the dimensions of this
 * frame and any frames stacked below it.
 * Coordinate system: workspace coordinates.
 * @return {!{topLeft: goog.math.Coordinate, bottomRight: goog.math.Coordinate}}
 *    Object with top left and bottom right coordinates of the bounding box.
 */
Blockly.Frame.prototype.getBoundingRectangle = function() {
  var frame = this.getFrameGroupRelativeXY();
  var width = this.getWidth() + this.resizeButtonWidth_;
  var height = this.getHeight() + this.resizeButtonHeight_ + this.titleTextareaHeight_;
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
Blockly.Frame.prototype.getFrameGroupRelativeXY = function() {
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
 * @return {number} The height of the flyout.
 */
Blockly.Frame.prototype.getHeight = function() {
  return Math.abs(this.rect_.bottom - this.rect_.top);
};

/**
 * Returns a bounding box describing the dimensions of this frame
 * and any frames stacked below it.
 * @returns {!FrameRectState} Object with width, height, x and y properties.
 */
Blockly.Frame.prototype.getBoundingFrameRect = function() {
  return {
    x: this.rect_.left,
    y: this.rect_.top,
    width: this.getWidth(),
    height: this.getHeight()
  };
};

/**
 * Returns the frame contained block id list.
 * @returns {Array<string>} The block id list;
 */
Blockly.Frame.prototype.getBlockIds = function() {
  return Object.keys(this.blockDB_);
};

/**
 * Get whether this frame is editable or not.
 * @return {boolean} True if editable.
 */
Blockly.Frame.prototype.isEditable = function() {
  return this.editable_ && !(this.workspace && this.workspace.options.readOnly);
};

/**
 * Get whether this frame is deletable or not.
 * @return {boolean} True if deletable.
 */
Blockly.Frame.prototype.isDeletable = function() {
  return this.deletable_ && !(this.workspace && this.workspace.options.readOnly);
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
  this.rect_.top = newLoc.y + this.resizeButtonHeight_ / 2;
  this.rect_.right = this.rect_.left + this.rect_.width + this.resizeButtonWidth_ / 2;
  this.rect_.bottom = this.rect_.top + this.rect_.height + this.resizeButtonWidth_ / 2;
  var xy = this.computeFrameRelativeXY();
  this.translate(xy.x, xy.y);
};

/**
 * Move a frame by a relative offset.
 * @param {number} dx Horizontal offset in workspace units.
 * @param {number} dy Vertical offset in workspace units.
 */
Blockly.Frame.prototype.moveBy = function(dx, dy) {
  this.oldBoundingFrameRect_ = this.getBoundingFrameRect();
  var xy = this.getFrameGroupRelativeXY();

  this.rect_.left += dx;
  this.rect_.top += dy;
  this.rect_.right += dx;
  this.rect_.bottom += dy;

  this.translate(xy.x + dx, xy.y + dy);

  Object.values(this.blockDB_).forEach((block) => {
    block.moveBy(dx, dy);
  });
  
  this.fireFrameRectChange();
  this.workspace.resizeContents();
};

/**
 * Add a block to the object of blockDB_.
 * @param {Blockly.Block} block Block to add.
 */
Blockly.Frame.prototype.addBlock = function(block) {
  if (!this.blockDB_[block.id]) {
    this.oldBlockIdList_ = this.getBlockIds();
    this.blockDB_[block.id] = block;
    if (this.rendered) {
      this.fireFrameBlocksChange();
    }
  }
};

/**
 * Remove a block from the  object of blockDB_.
 * @param {!Blockly.Block} block Block to remove.
 */
Blockly.Frame.prototype.removeBlock = function(block) {
  if (this.blockDB_[block.id]) {
    this.oldBlockIdList_ = this.getBlockIds();
    delete this.blockDB_[block.id];
    if (this.rendered) {
      this.fireFrameBlocksChange();
    }
  }
};

/**
 * Triggered when starting to drag the Frame.
 */
Blockly.Frame.prototype.onStartDrag = function() {
  this.setDragging(true);
  this.recordBlocksRelativeToSurfaceXY();
};

/**
 * Triggered when ending to drag the Frame.
 */
Blockly.Frame.prototype.onStopDrag = function() {
  this.fireFrameRectChange();
  this.setDragging(false);
};

/**
 * Triggered when starting to adjust the size of the Frame.
 * @private
 */
Blockly.Frame.prototype.onStartResizeRect_ = function() {
  this.foreignObject_.style['pointer-events'] = 'none';
};

/**
 * Triggered when ending to adjust the size of the Frame.
 * @private
 */
Blockly.Frame.prototype.onStopResizeRect_ = function() {
  this.foreignObject_.style['pointer-events'] = '';
};

/**
 * Handle a mouse-down on an frame's rect.
 * @param {!Event} e Mouse down event or touch start event.
 * @private
 */
Blockly.Frame.prototype.onRectMouseDown_ = function(e) {
  if (this.workspace.waitingCreateFrame) {
    e.stopPropagation();
  } else {
    var gesture = this.workspace && this.workspace.getGesture(e);
    if (gesture) {
      gesture.handleFrameStart(e, this);
    }
  }
};

/**
 * Handle a mouse-down on an frame's rect.
 * @param {Number} height Mouse down event or touch start event.
 */
Blockly.Frame.prototype.onTitleTextareaHeightChange = function(height) {
  let newHeight = height || this.textarea_.scrollHeight;
  if(typeof height === 'undefined') {
    this.textarea_.style.height = this.titleTextTextareaMinHeight_ + 'px';
    newHeight = this.textarea_.scrollHeight;
    this.textarea_.style.height = newHeight + 'px';
  }
  if(newHeight !== this.titleTextareaHeight_) {
    var hw = this.resizeButtonWidth_ / 2;
    var hh = this.resizeButtonHeight_ / 2;
    this.workspace.setResizesEnabled(false);
    var xy = this.computeFrameRelativeXY();
    this.titleTextareaHeight_ = newHeight;
    this.foreignObject_.setAttribute('height', newHeight);
    this.blocksGroup_.setAttribute('transform', 'translate(' + hw + ',' + (newHeight + hh) + ')');
    this.resizeGroup_.setAttribute('transform', 'translate(0,' + newHeight + ')');
    this.translate(xy.x, xy.y - this.titleTextareaHeight_);
    this.workspace.setResizesEnabled(true);
  }
};

/**
 * Record the current coordinates of the blocks that relative to workspace.
 */
Blockly.Frame.prototype.recordBlocksRelativeToSurfaceXY = function() {
  Object.values(this.blockDB_).forEach((block) => {
    const startXY = block.getRelativeToSurfaceXY();
    this.oldBlocksCoordinate_[block.id] = startXY;
  });
};

/**
 * Create the resize group.
 * @param {String} dir The direction of the button.
 * @param {!Event} e Mouse down event or touch start event.
 * @param {Boolean} takeOverSubEvents Whether to take over subsequent events.
 * @private
 */
Blockly.Frame.prototype.resizeButtonMouseDown_ = function(dir, e, takeOverSubEvents) {
  this.mostRecentEvent_ = e;
  this.oldBoundingFrameRect_ = this.getBoundingFrameRect();
  this.frameGroup_.style.cursor = 'pointer';
  this.workspace.setResizesEnabled(false);
  this.workspace.setResizingFrame(true);
  this.setResizing(true);
  this.onStartResizeRect_();
  this.recordBlocksRelativeToSurfaceXY();

  if(takeOverSubEvents) {
    var wsRelativeXY = Blockly.utils.getRelativeXY(this.workspace.svgBlockCanvas_);
    this.rect_.left = this.rect_.right = (e.offsetX - wsRelativeXY.x) / this.workspace.scale;
    this.rect_.top = this.rect_.bottom = (e.offsetY - wsRelativeXY.y) / this.workspace.scale;
    var xy = this.computeFrameRelativeXY();
    this.translate(xy.x, xy.y - this.titleTextareaHeight_);
  } else {
    var workspaceSvg = this.workspace.svgGroup_;
    this.resizeButtonMouseMoveBindData_ =
      Blockly.bindEventWithChecks_(workspaceSvg, 'mousemove', null,  this.resizeButtonMouseMove_.bind(this, dir));
    this.resizeButtonMouseUpBindData_ =
      Blockly.bindEventWithChecks_(workspaceSvg, 'mouseup', null,  this.resizeButtonMouseUp_.bind(this, dir));
  }
  
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
  var newCoord = this.computeFrameRelativeXY();
  newCoord.y -= this.titleTextareaHeight_;

  var blocks = Object.values(this.blockDB_);
  // If there are selected blocks in the frame, it needs to keep their relative position in the workspace unchanged.
  if(blocks.length) {
    var oldCoord = Blockly.utils.getRelativeXY(this.getSvgRoot());
    var dx = oldCoord.x - newCoord.x;
    var dy = oldCoord.y - newCoord.y;
    if(dx || dy) {
      blocks.forEach((block) => {
        var xy = block.getRelativeToSurfaceXY(true);
        block.translate(xy.x + dx, xy.y + dy);
        block.moveConnections_(dx, dy);
      });
    }
  }
  this.translate(newCoord.x, newCoord.y);
  this.updateFrameRectSize();
  this.updateTitleBoxSize();
  this.updateResizeButtonsPosition();
};

/**
 * Create the resize group.
 * @param {String} dir The direction of the button.
 * @param {!Event} e Mouse down event or touch start event.
 * @param {Boolean} takeOverSubEvents Whether to take over subsequent events.
 * @private
 */
Blockly.Frame.prototype.resizeButtonMouseUp_ = function(dir, e, takeOverSubEvents) {
  this.frameGroup_.style.cursor = '';
  if (e.target === this.resizeButtons[dir]) {
    this.resizeButtonMouseMove_(dir,e);
  }
  this.checkRect_();
  this.onStopResizeRect_();
  this.onTitleTextareaHeightChange();
  this.setResizing(false);
  if (takeOverSubEvents) {
    this.workspace.setResizingFrame(false);
    this.updateOwnedBlocks();
    this.rendered = true;
    Blockly.Events.fire(new Blockly.Events.FrameCreate(this));
  } else {
    this.fireFrameRectChange();
    this.updateOwnedBlocks();
    Blockly.unbindEvent_(this.resizeButtonMouseMoveBindData_);
    Blockly.unbindEvent_(this.resizeButtonMouseUpBindData_);
  }
  this.workspace.setResizesEnabled(true);
};

/**
 * Render the frame.
 * @param {!FrameRectState} rect The frame rect state.
 * @private
 */
Blockly.Frame.prototype.render = function(rect) {
  this.oldBoundingFrameRect_ = this.getBoundingFrameRect();
  this.rect_.left = rect.x + this.resizeButtonWidth_ / 2;
  this.rect_.top = rect.y + this.resizeButtonHeight_ / 2;
  this.rect_.bottom = this.rect_.top + rect.height;
  this.rect_.right = this.rect_.left + rect.width;
  this.rect_.width = rect.width;
  this.rect_.height = rect.height;

  this.translate(rect.x, rect.y);
  this.updateFrameRectSize();
  this.updateResizeButtonsPosition();
  this.fireFrameRectChange();
};

/**
 * If a block is within the range of the frame, it can be collected.
 * @param {Blockly.BlockSvg} block Mouse down event or touch start event.
 * @return {boolean} true if the block was successfully added.
 */
Blockly.Frame.prototype.requestMoveInBlock = function(block) {
  const {x,y} = block.getRelativeToSurfaceXY();
  var {left, right, top, bottom} = this.rect_;
  top += this.titleTextareaHeight_;
  bottom += this.titleTextareaHeight_;
  let removeAble = false;
  if (block.parentBlock_) {
    removeAble = false;
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
 * Recursively adds or removes the resizing class to this node.
 * @param {boolean} adding True if adding, false if removing.
 * @package
 */
Blockly.Frame.prototype.setResizing = function(adding) {
  if (adding) {
    this.oldBoundingFrameRect_ = this.getBoundingFrameRect();
    var group = this.getSvgRoot();
    group.translate_ = '';
    Blockly.utils.addClass(
        /** @type {!Element} */ (this.frameGroup_), 'frameResizing');
    this.onStartResizeRect_();
  } else {
    Blockly.utils.removeClass(
        /** @type {!Element} */ (this.frameGroup_), 'frameResizing');
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
  // Save the current frame in a variable for use in closures.
  var frame = this;
  var menuOptions = [];
  if (this.isEditable()) {
    menuOptions.push(Blockly.ContextMenu.frameDeleteOption(frame, e));
    menuOptions.push(Blockly.ContextMenu.frameCleanupOption(frame, Object.keys(this.blockDB_).length));
  }
  Blockly.ContextMenu.show(e, menuOptions, this.RTL);
  Blockly.ContextMenu.currentFrame = this;
};

/**
 * Transforms a frame by setting the translation on the transform attribute
 * of the frame's SVG.
 * @param {number} x The x coordinate of the translation in workspace units.
 * @param {number} y The y coordinate of the translation in workspace units.
 */
Blockly.Frame.prototype.translate = function(x, y) {
  this.getSvgRoot().setAttribute('transform',
      'translate(' + x + ',' + y + ')');
};

Blockly.Frame.prototype.updateFrameRectSize = function() {
  this.svgRect_.setAttribute("width", Math.abs(this.rect_.width));
  this.svgRect_.setAttribute("height", Math.abs(this.rect_.height));
};

/**
 * Updates the frame's title
 * @param {string} newTitle The new title of the frame
 */
Blockly.Frame.prototype.updateTitle = function(newTitle) {
  Blockly.Events.fire(new Blockly.Events.FrameRetitle(this, newTitle));
  this.title = newTitle;
};

/**
 * Update the title box size
 */
Blockly.Frame.prototype.updateTitleBoxSize = function() {
  if(this.foreignObject_) {
    this.foreignObject_.setAttribute("height", this.titleTextareaHeight_);
    this.foreignObject_.setAttribute("width", this.getWidth());
  }
};

/**
 * Update the owned blocks
 */
Blockly.Frame.prototype.updateOwnedBlocks = function() {
  // Removes all not top blocks
  const oldBlocks = Object.values(this.blockDB_);
  oldBlocks.forEach(function(block) {
    if (block.parentBlock_) {
      block.requestMoveOutFrame();
    }
  });

  const allTopBlocks = this.workspace.getTopBlocks();
  for (let index = 0; index < allTopBlocks.length; index++) {
    if(!allTopBlocks[index].requestMoveInFrame()) {
      allTopBlocks[index].requestMoveOutFrame();
    }
  }
};

/**
 * Update the most recent frame group size and position
 * @param {number} diffX The new size change in the x direction
 * @param {number} diffY The new size change in the y direction
 * @param {string} xDir On the X-axis, from left to right or right to left
 * @param {string} yDir On the Y-axis, from top to bottom or from bottom to top
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
  this.resizeButtons.bl.setAttribute('y', this.getHeight());
  this.resizeButtons.br.setAttribute('x', this.getWidth());
  this.resizeButtons.br.setAttribute('y', this.getHeight());
};

/**
 * Dispose of this frame.
 * @param {?boolean} retainBlocks Whether to keep blocks or not.
 */
Blockly.Frame.prototype.dispose = function(retainBlocks) {
  if (!this.workspace) {
    // The frame has already been deleted.
    return;
  }

  this.oldBlockIdList_ = this.getBlockIds();
  var oldBlocks = Object.assign({}, this.blockDB_);
  this.blockDB_ = {};

  for (const key in oldBlocks) {
    const block = oldBlocks[key];
    var ws = block.workspace;
    if (retainBlocks) {
      block.requestMoveOutFrame();
    } else {
      setTimeout(function() {
        ws.fireDeletionListeners(block);
      });
      block.dispose(true, true);
    }
  }

  Blockly.Events.fire(new Blockly.Events.FrameDelete(this));

  goog.dom.removeNode(this.frameGroup_);
  this.frameGroup_ = null;
  this.rect_ = null;
  this.svgRect_ = null;

  // Remove from the list of top frames and the frame database.
  this.workspace.removeTopFrame(this);
  this.workspace = null;
};
