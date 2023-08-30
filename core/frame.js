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
goog.require('Blockly.ColorSelector');
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
    blocks: [],
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isCollapsed: false
  };

  /** @type {boolean} */
  this.RTL = workspace.RTL;


  const isClone = !!workspace.getFrameById(this.options.id);

  /**
   * The ID of the frame
   */
  this.id = (this.options.id && !isClone) ? this.options.id : Blockly.utils.genUid();

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
   * whether the frame is collapsed or expanded.
   */
  this.isCollapsed = this.options.isCollapsed || false;

  /**
   * The frame's color
   */
  this.color = this.options.color || '45, 140, 255';

  /**
   * Whether the frame is locked
   */
  this.locked = this.options.locked || false;

  /**
   * The event that most recently updated this gesture.
   * @type {Event}
   * @private
   */
  this.mostRecentEvent_ = null;

  /** @type {boolean} */
  this.rendered = false;

  /**
   * @type {boolean}
  */
  this.selected = false;


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

  /**
   * @type {boolean}
   * @private
   */
  this.movable_ = true;

  /**
   * @type {boolean}
   * @private
   */
  this.isEmpty_ = null;

  this.oldBlocksCoordinate_ = null;

  this.resizeButtons = {
    tl: null,
    tr: null,
    bl: null,
    br: null,
  };

  this.createDom_();
  this.appendBlocksToBlocksCanvas();
  this.createCollapsedContent_();

  this.setIsEmpty(!this.options.blocks.length);

  workspace.addTopFrame(this);

  if (this.options.id) {
    this.rendered = true;
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
Blockly.Frame.prototype.resizeButtonWidth_ = 8;

/**
 * The height of the resize button.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.resizeButtonHeight_ = 8;

/**
 * The height of the title input.
 * @type {string}
 * @private
 */
Blockly.Frame.prototype.titleInputHeight_ = 24;

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
  Blockly.Events.disable();
  this.options.blocks.forEach((blockId) => {
    var block = this.workspace.getBlockById(blockId);
    if (block) {
      this.addBlock(block);
      block.frame_ = this;
      block.moveBlockToContainer('frame');
    }
  });
  Blockly.Events.enable();
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
 * Clear the frame of transform="..." attributes.
 * Used when the frame is switching from 3d to 2d transform or vice versa.
 * @private
 */
Blockly.Frame.prototype.clearTransformAttributes_ = function() {
  Blockly.utils.removeAttribute(this.getSvgRoot(), 'transform');
};

/**
 * Create the frame's DOM.
 * @private
 */
Blockly.Frame.prototype.createDom_ = function() {
  /** @type {SVGElement} */
  this.frameGroup_ = Blockly.utils.createSvgElement('g',
      {
        'class': `blocklyFrame${this.locked ? ' blocklyFrameLocked' : ''}`,
      }, this.workspace.svgBlockCanvas_);
  // Avoid blinking
  this.frameGroup_.style.visibility = 'hidden';
  // Expose this block's ID on its top-level SVG group.
  if (this.frameGroup_.dataset) {
    this.frameGroup_.dataset.id = this.id;
  }
  var tx = this.resizeButtonWidth_ / 2;
  var ty = this.titleInputHeight_ + this.resizeButtonHeight_ / 2;
  /** @type {SVGElement} */
  this.blocksGroup_ = Blockly.utils.createSvgElement('g',
      {
        'class': 'blocklyFrameBlockCanvas',
        'transform': 'translate(' + tx + ',' + ty + ')',
      }, this.frameGroup_);

  /** @type {SVGElement} */
  this.svgRect_ = Blockly.utils.createSvgElement('rect',
      {
        'class': 'blocklyFrameRectangle',
        'stroke': 'transparent',
        'fill': `rgba(${this.color},0.12)`,
        'x': 0 ,
        'y': 0,
        'height': this.rect_.height,
        'width': this.rect_.width
      },
      this.blocksGroup_);
  this.svgRect_.tooltip = this;

  Blockly.bindEvent_(this.svgRect_, 'mousedown', this, function() {
    // If the frame is locked, it cannot be selected.
    if(this.locked || !this.isEmpty_) return;

    this.select();
  });

  Blockly.bindEventWithChecks_(this.frameGroup_, 'mousedown', null, this.onMouseDown_.bind(this));

  this.foreignObject_ = Blockly.utils.createSvgElement('foreignObject', {
    class: 'blocklyFrameForeignObject',
    'x': this.resizeButtonWidth_ / 2,
    'y': 0,
    height: 0,
    width: 0
  }, this.frameGroup_);
  Blockly.bindEvent_(this.blocksGroup_, 'mouseenter', this, function() {
    if (!this.workspace.draggingBlocks_ && !this.locked) {
      this.frameGroup_.classList.add('blocklyFrameHover');
    }
  });
  Blockly.bindEvent_(this.blocksGroup_, 'mouseleave', this, function() {
    if (!this.workspace.draggingBlocks_) {
      this.frameGroup_.classList.remove('blocklyFrameHover');
    }
  });
  this.foreignObjectBody_ = document.createElementNS(Blockly.HTML_NS, 'body');
  this.foreignObjectBody_.setAttribute('xmlns', Blockly.HTML_NS);
  this.foreignObjectBody_.className = 'blocklyMinimalBody blocklyFrameForeignObjectBody';
  this.foreignObject_.appendChild(this.foreignObjectBody_);
  this.createCollapseButton_();
  this.createTitleEditor_();
  this.createLockButton_();
  this.createMenuButton_();
  this.createResizeGroup_();
};

Blockly.Frame.prototype.createCollapseButton_ = function() {
  this.collapseButton_ = document.createElementNS(Blockly.HTML_NS, 'div');
  this.collapseButton_.className = 'blocklyFrameActionButton blocklyFrameCollapseButton';
  Blockly.bindEventWithChecks_(this.collapseButton_, 'mousedown', this, this.triggerChangeCollapsed);
  this.foreignObjectBody_.appendChild(this.collapseButton_);
};

Blockly.Frame.prototype.createCollapsedContent_ = function() {
  var tx = this.resizeButtonWidth_ / 2;
  var ty = this.titleInputHeight_ + this.resizeButtonHeight_ / 2;

  this.collapseContentForeignObject_ = Blockly.utils.createSvgElement('foreignObject', {
    class: 'blocklyFrameCollapsedContent',
    'x': tx,
    'y': ty,
    height: 60,
    width: this.rect_.width
  }, this.frameGroup_);
  this.collapseContentForeignObjectBody_ = document.createElementNS(Blockly.HTML_NS, 'body');
  this.collapseContentForeignObjectBody_.setAttribute('xmlns', Blockly.HTML_NS);
  this.collapseContentForeignObjectBody_.className = 'blocklyMinimalBody blocklyFrameForeignObjectBody';
  this.collapseContentForeignObject_.appendChild(this.collapseContentForeignObjectBody_);

  this.collapseContent_ = document.createElementNS(Blockly.HTML_NS, 'div');
  this.collapseContent_.className = 'collapsedContent';

  if (this.isCollapsed) {
    this.frameGroup_.classList.add('blocklyFrameCollapsed');
    this.blocksGroup_.style.display = 'none';
    this.resizeGroup_.style.display = 'none';
    this.updateCollapsedContent_();
    this.collapseContentForeignObjectBody_.appendChild(this.collapseContent_);
    setTimeout(() => {
      Object.values(this.blockDB_).forEach((block) => {
        block.getConnections_().forEach(c => c.hideAll());
      });
      for (const key in this.workspace.commentDB_) {
        const comment = this.workspace.commentDB_[key];
        if (comment.block_ && comment.block_.isInFrame() === this) {
          comment.bubble_.bubbleGroup_.style.display = 'none';
        }
      }
    }, 1);
  }
};

Blockly.Frame.prototype.updateCollapsedContent_ = function() {
  // Scratch-specific: don't count shadow blocks in blocks count
  const blockCount = this.getBlocksCount();
  this.collapseContent_.style.backgroundColor = `rgb(${this.color})`;
  this.collapseContent_.innerHTML = Blockly.Msg.COLLAPSED_X_BLOCKS.replace('%1', String(blockCount));
};

Blockly.Frame.prototype.createLockButton_ = function() {
  this.lockButton_ = document.createElementNS(Blockly.HTML_NS, 'div');
  this.lockButton_.className = 'blocklyFrameActionButton blocklyFrameLockButton';
  Blockly.bindEventWithChecks_(this.lockButton_, 'mousedown', this, this.triggerChangeLock);
  this.foreignObjectBody_.appendChild(this.lockButton_);
};

/**
 * Create the editor for the frame's title.
 * @private
 */
Blockly.Frame.prototype.createMenuButton_ = function() {
  this.menuButton_ = document.createElementNS(Blockly.HTML_NS, 'div');
  this.menuButton_.className = 'blocklyFrameActionButton blocklyFrameMenuButton';
  Blockly.bindEventWithChecks_(this.menuButton_, 'mousedown', this, function(e) {
    if (Blockly.locked) return;
    if (this.locked) return;

    this.showContextMenu_(e);
    e.stopPropagation();
  });
  this.foreignObjectBody_.appendChild(this.menuButton_);
};

/**
 * Create the editor for the frame's title.
 * @private
 */
Blockly.Frame.prototype.createTitleEditor_ = function() {
  // Width adaptive input box
  var titleWrapper = goog.dom.createDom('div', {class: 'blocklyFrameTitleWrapper'});
  var titleInput = goog.dom.createDom('input', {
    class: 'blocklyFrameTitleInput',
    dir: this.workspace.RTL ? 'RTL' : 'LTR',
    maxlength: 200,
  });
  var inputWrapper = goog.dom.createDom('div', {class: 'blocklyFrameInputWrapper'});
  this.titleInput_ = titleInput;
  this.titleInput_.tooltip = this;
  inputWrapper.appendChild(titleInput);
  titleWrapper.appendChild(inputWrapper);
  titleInput.value = this.title;

  requestAnimationFrame(() => this.onInputTitle());

  Blockly.bindEvent_(inputWrapper, 'mousedown', this, function() {
    // If the frame is locked or the workspace is locked, it cannot be selected.
    if (Blockly.locked || this.locked) return;
    this.select();
  });

  Blockly.bindEvent_(inputWrapper, 'mouseup', this, function(e) {
    // If the frame is locked or the workspace is locked, it cannot be selected.
    if (Blockly.locked || this.locked) return;
    const now = Date.now();
    const delta = now - (e.target.getAttribute('last-down') || now);
    e.target.setAttribute('last-down', now);
    if (delta > 0 && delta < 250) {
      this.titleInput_.style['pointer-events'] = 'auto';
      this.titleInput_.focus();
    }
  });

  Blockly.bindEvent_(titleWrapper, 'mouseenter', this, function() {
    if (Blockly.locked) return;
    if (!this.workspace.draggingBlocks_ && !this.locked) {
      this.frameGroup_.classList.add('blocklyFrameHover');
    }
  });
  Blockly.bindEvent_(titleWrapper, 'mouseleave', this, function() {
    if (Blockly.locked) return;
    if (!this.workspace.draggingBlocks_) {
      this.frameGroup_.classList.remove('blocklyFrameHover');
    }
  });
  this.foreignObjectBody_.appendChild(titleWrapper);

  var xy = this.computeFrameRelativeXY();
  this.translate(xy.x, xy.y);
  this.frameGroup_.style.visibility = 'visible';
  // Don't zoom with mousewheel.
  Blockly.bindEventWithChecks_(titleInput, 'wheel', this, function(e) {
    e.stopPropagation();
  });
  Blockly.bindEventWithChecks_(titleInput, 'change', this, function(e) {
    var newValue = e.target.value;
    if (!newValue.trim()) {
      e.target.value = this.title;
    } else if (this.title != newValue) {
      this.onTitleChange(newValue);
    }
  });
  Blockly.bindEventWithChecks_(titleInput, 'blur', this, function(e) {
    e.target.style['pointer-events'] = 'none';
  });
  Blockly.bindEventWithChecks_(titleInput, 'input', this, this.onInputTitle);
  this.updateTitleBoxSize();
};

/**
 * Create the resize group.
 * @return {!Element} The resize group.
 * @private
 */
Blockly.Frame.prototype.createResizeGroup_ = function() {
  var tx = 0;
  var ty = this.titleInputHeight_;
  /** @type {SVGElement} */
  this.resizeGroup_ = Blockly.utils.createSvgElement('g', {
    'class': 'frameResizeButtons',
    'transform': 'translate(' + tx + ',' + ty + ')',
  },  this.frameGroup_);
  // top left corner
  this.resizeButtons.tl = Blockly.utils.createSvgElement('rect', {
    'class': 'blocklyResizeButtonNW',
    'stroke': this.borderColor_,
    'fill': '#FFFFFF',
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
    'fill': '#FFFFFF',
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
    'fill': '#FFFFFF',
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
    'fill': '#FFFFFF',
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
  var padding = 50;
  var height = padding;
  var width = 0;

  const { cols: columns, maxWidths } = this.getOrderedBlockColumns();
  let cursorX = padding;

  for (const column of columns) {
    let cursorY = padding;
    let maxWidth = 0;

    for (const block of column.blocks) {
      let extraWidth = 0;
      let extraHeight = 72;
      let xy = block.getRelativeToSurfaceXY(true);
      if (cursorX - xy.x !== 0 || cursorY - xy.y !== 0) {
        block.moveBy(cursorX - xy.x, cursorY - xy.y);
      }
      let heightWidth = block.getHeightWidth();
      cursorY += heightWidth.height + extraHeight;
      let maxWidthWithComments = maxWidths[block.id] || 0;
      maxWidth = Math.max(maxWidth, Math.max(heightWidth.width + extraWidth, maxWidthWithComments));
    }

    width += maxWidth + 2 * padding;
    height = Math.max(height, (cursorY - 72 + padding));
    cursorX += maxWidth + 96;
  }

  this.render({
    x: this.rect_.left,
    y: this.rect_.top,
    height: height,
    width: width
  });

  Blockly.Events.setGroup(false);
  this.workspace.setFrameToFront();
  this.workspace.setResizesEnabled(true);
};

Blockly.Frame.prototype.getOrderedBlockColumns = function() {
  const blocks = Object.values(this.blockDB_);
  let maxWidths = {};
  let cols = [];
  let orphans = { x: -999999, count: 0, blocks: [] };
  const TOLERANCE = 256;

  for (const block of blocks) {
    if (block.hidden) {
      continue;
    }
    let position = block.getRelativeToSurfaceXY();

    let bestCol = null;
    let bestError = TOLERANCE;

    // Find best columns
    for (const col of cols) {
      let err = Math.abs(position.x - col.x);
      if (err < bestError) {
        bestError = err;
        bestCol = col;
      }
    }

    if (bestCol) {
      // We found a column that we fitted into
      // re-average the columns as more items get added...
      bestCol.x = (bestCol.x * bestCol.count + position.x) / ++bestCol.count;
      bestCol.blocks.push(block);
    } else {
      // Create a new column
      cols.push({x: position.x, count: 1, blocks: [block]});
    }
  }

  // Sort columns, then blocks inside the columns
  cols.sort((a, b) => a.x - b.x);
  for (const col of cols) {
    col.blocks.sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y);
  }

  return { cols: cols, orphans: orphans, maxWidths: maxWidths };
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
  var y = ry - this.resizeButtonHeight_ / 2 - this.titleInputHeight_;
  return new goog.math.Coordinate(x, y);
};

Blockly.Frame.prototype.duplicateFrameBlocks = function() {
  this.options.blocks.forEach((blockId) => {
    const oldBlock = this.workspace.getBlockById(blockId);
    if (oldBlock) {
      const xml = Blockly.Xml.blockToDom(oldBlock);
      this.workspace.setResizesEnabled(false);
      const newBlock = Blockly.Xml.domToBlock(xml, this.workspace);
      // Scratch-specific: Give shadow dom new IDs to prevent duplicating on paste
      Blockly.scratchBlocksUtils.changeObscuredShadowIds(newBlock);

      // The position of the old block in workspace coordinates.
      var oldBlockPosWs = oldBlock.getRelativeToSurfaceXY();

      // Place the new block as the same position as the old block.
      newBlock.moveBy(oldBlockPosWs.x, oldBlockPosWs.y);

      this.addBlock(newBlock);
      newBlock.frame_ = this;
      newBlock.moveBlockToContainer('frame');
    }
  });
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
    this.fireFrameBlocksCoordinatesChange(true);
  }
};

Blockly.Frame.prototype.fireFrameBlocksCoordinatesChange = function(isFollowFrame) {
  if (this.oldBlocksCoordinate_) {
    // When the position of a Frame changes, it needs to update the position information of the blocks it contains.
    for (const key in this.blockDB_) {
      if (Object.hasOwnProperty.call(this.blockDB_, key)) {
        var block = this.blockDB_[key];
        var event = new Blockly.Events.BlockMove(block, isFollowFrame);
        var data = this.oldBlocksCoordinate_[block.id];
        if (data) {
          event.oldCoordinate = data.oldCoordinate;
          event.recordNew();
          var dxy = goog.math.Coordinate.difference(event.newCoordinate, event.oldCoordinate);
          block.moveBy(dxy.x, dxy.y, true);
          Blockly.Events.fire(event);
          block.fireIconsMoveEvent(data.dragIconData);
        }
      }
    }
    this.oldBlocksCoordinate_ = null;
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
  var height = this.getHeight() + this.resizeButtonHeight_ + this.titleInputHeight_;
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
 * Get the width and height of the frame.
 * @return {!{height: number, width: number}} Object with height and width properties.
 */
Blockly.Frame.prototype.getHeightWidth = function() {
  var height = this.getHeight();
  var width = this.getWidth();
  return {height: height, width: width};
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

Blockly.Frame.prototype.getBlocksCount = function() {
  let blocksCount = 0;
  const blocks = Object.values(this.blockDB_);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.isShadow_) {
      blocksCount++;
    }
    if (block.childBlocks_) {
      block.childBlocks_.forEach(childBlock => {
        if(!childBlock.isShadow_) {
          blocks.push(childBlock);
        }
      });
    }
  }
  return blocksCount;
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
 * Get whether this frame is movable or not.
 * @return {boolean} True if movable.
 */
Blockly.Frame.prototype.isMovable = function() {
  return this.movable_ && !(this.workspace && this.workspace.options.readOnly);
};

/**
 * Set whether this frame is movable or not.
 * @param {boolean} movable True if movable.
 */
Blockly.Frame.prototype.setMovable = function(movable) {
  this.movable_ = movable;
};

/**
 * Move this block to its workspace's drag surface, accounting for positioning.
 * Generally should be called at the same time as setDragging_(true).
 * Does nothing if useDragSurface_ is false.
 * @param {!Event} e The most recent move event.
 * @private
 */
Blockly.Frame.prototype.moveToDragSurface_ = function(e) {
  var xy = this.getFrameGroupRelativeXY();
  this.clearTransformAttributes_();
  Blockly.ColorSelector.hide();
  this.workspace.blockDragSurface_.translateSurface(xy.x, xy.y);
  // Execute the move on the top-level SVG component
  this.workspace.blockDragSurface_.setBlocksAndShow(this.getSvgRoot(), this.isBatchElement, e);
  this.workspace.blockDragSurface_.dragGroup_.setAttribute('filter', 'none');
  this.svgRect_.setAttribute('filter', 'url(#' + this.workspace.blockDragSurface_.dragShadowFilterId_ + ')');
};

/**
 * Move this block back to the workspace block canvas.
 * Generally should be called at the same time as setDragging_(false).
 * Does nothing if useDragSurface_ is false.
 * @param {!goog.math.Coordinate} newXY The position the block should take on
 *     on the workspace canvas, in workspace coordinates.
 * @param {boolean} wouldDeleteFrame the frame will be deleted.
 * @private
 */
Blockly.Frame.prototype.moveOffDragSurface_ = function(newXY, wouldDeleteFrame) {
  if (wouldDeleteFrame) {
    this.fireFrameBlocksCoordinatesChange(false);
  } else {
    this.rect_.left = newXY.x + this.resizeButtonWidth_ / 2;
    this.rect_.top = newXY.y + this.resizeButtonHeight_ / 2 + this.titleInputHeight_;
    this.rect_.right = this.rect_.left + this.rect_.width + this.resizeButtonWidth_ / 2;
    this.rect_.bottom = this.rect_.top + this.rect_.height + this.resizeButtonWidth_ / 2;
  }
  this.translate(newXY.x, newXY.y);
  this.svgRect_.setAttribute('filter', 'none');
  this.workspace.blockDragSurface_.dragGroup_.setAttribute('filter',
      'url(#' + this.workspace.blockDragSurface_.dragShadowFilterId_ + ')');
  this.workspace.blockDragSurface_.clearAndHide(this.workspace.getCanvas());
};

/**
 * Move this frame during a drag, taking into account whether we are using a
 * drag surface to translate frame.
 * @param {!goog.math.Coordinate} newLoc The location to translate to, in
 *     workspace coordinates.
 * @param {boolean} useDragSurface True if use drag surface.
 * @package
 */
Blockly.Frame.prototype.moveDuringDrag = function(newLoc, useDragSurface = true) {
  if (useDragSurface) {
    this.workspace.blockDragSurface_.translateSurface(newLoc.x, newLoc.y);
  } else {
    this.rect_.left = newLoc.x + this.resizeButtonWidth_ / 2;
    this.rect_.top = newLoc.y + this.resizeButtonHeight_ / 2 + this.titleInputHeight_;
    this.rect_.right = this.rect_.left + this.rect_.width + this.resizeButtonWidth_ / 2;
    this.rect_.bottom = this.rect_.top + this.rect_.height + this.resizeButtonWidth_ / 2;
    var xy = this.getFrameGroupRelativeXY();
    this.translate(xy.x + newLoc.x, xy.y + newLoc.y);
  }
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
  this.recordBlocksRelativeToSurfaceXY();
  this.translate(xy.x + dx, xy.y + dy);
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
  this.setIsEmpty(!Object.keys(this.blockDB_).length);
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
  this.setIsEmpty(!Object.keys(this.blockDB_).length);
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

Blockly.Frame.prototype.onInputTitle = function() {
  this.titleInput_.style.width = '10px';
  this.titleInput_.style.width = this.titleInput_.scrollWidth + 10 + 'px';
};

/**
 * Triggered when ending to adjust the size of the Frame.
 * @private
 */
Blockly.Frame.prototype.onStopResizeRect_ = function() {
  this.foreignObject_.style['pointer-events'] = '';
};

/**
 * Select this block.  Highlight it visually.
 */
Blockly.Frame.prototype.select = function() {
  if (Blockly.locked) return;
  if (Blockly.selected == this || !this.workspace) {
    return;
  }
  var oldId = null;
  if (Blockly.selected) {
    oldId = Blockly.selected.id;
    // Unselect any previously selected object.
    Blockly.Events.disable();
    try {
      Blockly.selected.unselect();
    } finally {
      Blockly.Events.enable();
    }
  }
  this.selected = true;
  var event = new Blockly.Events.Ui(null, 'selected', oldId, this.id);
  event.workspaceId = this.workspace.id;
  Blockly.Events.fire(event);
  Blockly.selected = this;
  this.addSelect();
};

/**
 * Unselect this block.  Remove its highlighting.
 */
Blockly.Frame.prototype.unselect = function() {
  if (Blockly.selected != this) {
    return;
  }
  this.selected = false;
  var event = new Blockly.Events.Ui(null, 'selected', this.id, null);
  event.workspaceId = this.workspace.id;
  Blockly.Events.fire(event);
  Blockly.selected = null;
  this.removeSelect();
};

/**
 * Select this frame.
 */
Blockly.Frame.prototype.addSelect = function() {
  Blockly.utils.addClass(
      /** @type {!Element} */ (this.frameGroup_), 'frameSelected');
};

/**
 * Unselect this frame.
 */
Blockly.Frame.prototype.removeSelect = function() {
  Blockly.utils.removeClass(
      /** @type {!Element} */ (this.frameGroup_),  'frameSelected');
};

/**
 * Handle a mouse-down on the frame group.
 * @param {!Event} e Mouse down event or touch start event.
 * @private
 */
Blockly.Frame.prototype.onMouseDown_ = function(e) {
  // If the frame is locked, it cannot be selected.
  if(this.locked || e.ctrlKey || e.metaKey) return;

  if (this.workspace.waitingCreateFrame) {
    e.stopPropagation();
  } else if (Blockly.selected == this || this.selected || e.button === 2) {
    // Avoiding canceling right-click events on blocks in the frame.
    var hasGesture = this.workspace && this.workspace.hasGesture();
    if (!hasGesture) {
      var gesture = this.workspace && this.workspace.getGesture(e);
      if (gesture) {
        gesture.handleFrameStart(e, this);
      }
    }
  }
};

/**
 * Handle the frame's title change event.
 * @param {string} newTitle The new title of the frame
 */
Blockly.Frame.prototype.onTitleChange = function(newTitle) {
  Blockly.Events.fire(new Blockly.Events.FrameRetitle(this, newTitle));
  this.title = newTitle;
};

/**
 * Record the current coordinates of the blocks that relative to workspace.
 */
Blockly.Frame.prototype.recordBlocksRelativeToSurfaceXY = function() {
  this.oldBlocksCoordinate_ = {};
  Object.values(this.blockDB_).forEach((block) => {
    const oldCoordinate = block.getRelativeToSurfaceXY();
    this.oldBlocksCoordinate_[block.id] = {
      oldCoordinate,
      dragIconData: block.initIconData()
    };
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
  this.select();
  this.setResizing(true);
  this.onStartResizeRect_();

  if(takeOverSubEvents) {
    var scale = this.workspace.scale;
    var wsXY = Blockly.utils.getRelativeXY(this.workspace.svgBlockCanvas_);
    const rect = e.target.getBoundingClientRect();
    const offsetX = Math.round(e.clientX - rect.left);
    const offsetY = Math.round(e.clientY - rect.top);
    this.rect_.left = this.rect_.right = (offsetX - wsXY.x) / scale;
    this.rect_.top = this.rect_.bottom = (offsetY - wsXY.y) / scale;
    var xy = this.computeFrameRelativeXY();
    this.translate(xy.x, xy.y);
  } else {
    this.resizeButtonMouseMoveBindData_ =
      Blockly.bindEventWithChecks_(document, 'mousemove', null,  this.resizeButtonMouseMove_.bind(this, dir));
    this.resizeButtonMouseUpBindData_ =
      Blockly.bindEventWithChecks_(document, 'mouseup', null,  this.resizeButtonMouseUp_.bind(this, dir));
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
  if (this.workspace.isInWorkspaceSvg(e)) {
    var diffX = (e.clientX - this.mostRecentEvent_.clientX) / this.workspace.scale;
    var diffY = (e.clientY - this.mostRecentEvent_.clientY) / this.workspace.scale;
    this.mostRecentEvent_ = e;
    var xDir = dir === 'tr' || dir === 'br' ? 'ltr' : 'rtl';
    var yDir = dir === 'tl' || dir === 'tr' ? 'btt' : 'ttb';
    this.updateBoundingClientRect(diffX, diffY, xDir, yDir);
    var newCoord = this.computeFrameRelativeXY();

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
        });
      }
    }
    this.translate(newCoord.x, newCoord.y);
    this.updateFrameRectSize();
    this.updateTitleBoxSize();
    this.updateResizeButtonsPosition();
  }
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
  this.setResizing(false);
  this.workspace.setResizingFrame(false);
  if (takeOverSubEvents) {
    if(this.getHeight() < this.minHeight_ || this.getWidth() < this.minWidth_) {
      Blockly.Events.disable();
      this.workspace.setWaitingCreateFrameEnabled(false);
      this.workspace.cancelCurrentGesture();
      this.dispose();
      Blockly.Events.enable();
    } else {
      this.updateOwnedBlocks();
      this.rendered = true;
      Blockly.Events.fire(new Blockly.Events.FrameCreate(this));
      this.workspace.setResizesEnabled(true);
    }
  } else {
    this.fireFrameRectChange();
    this.updateOwnedBlocks();
    Blockly.unbindEvent_(this.resizeButtonMouseMoveBindData_);
    Blockly.unbindEvent_(this.resizeButtonMouseUpBindData_);
    this.workspace.setResizesEnabled(true);
  }
};

/**
 * Render the frame.
 * @param {!FrameRectState} rect The frame rect state.
 * @param {Boolean} moveBlocks Whether to move blocks.
 * @private
 */
Blockly.Frame.prototype.render = function(rect, moveBlocks = true) {
  const blockMoveEvents = {};
  this.oldBoundingFrameRect_ = this.getBoundingFrameRect();
  if (moveBlocks) {
    this.recordBlocksRelativeToSurfaceXY();
  } else {
    Object.values(this.blockDB_).forEach((block) => {
      const event = new Blockly.Events.BlockMove(block);
      blockMoveEvents[block.id] = event;
    });
  }
  this.rect_.left = rect.x;
  this.rect_.top = rect.y;
  this.rect_.bottom = this.rect_.top + rect.height;
  this.rect_.right = this.rect_.left + rect.width;
  this.rect_.width = rect.width;
  this.rect_.height = rect.height;
  var xy = this.computeFrameRelativeXY();
  this.translate(xy.x, xy.y);
  if (!moveBlocks) {
    Object.values(blockMoveEvents).forEach((event) => {
      event.recordNew();
      Blockly.Events.fire(event);
    });
  }
  this.updateFrameRectSize();
  this.updateTitleBoxSize();
  this.updateResizeButtonsPosition();
  this.fireFrameRectChange();
  this.workspace.resizeContents();
};

/**
 * If a block is within the range of the frame, it can be collected.
 * @param {Blockly.BlockSvg} block Mouse down event or touch start event.
 * @return {boolean} true if the block was successfully added.
 */
Blockly.Frame.prototype.requestMoveInBlock = function(block) {
  const {x,y} = block.getRelativeToSurfaceXY();
  var {left, right, top, bottom} = this.rect_;
  let removeAble = false;
  if (block.frame_ && block.frame_ !== this) {
    removeAble = false;
  } else if (x > left && x < right && y > top && y < bottom) {
    // Already within the current frame,
    // or the frame is not locked, and within the boundaries of the frame.
    removeAble = block.frame_ === this || (!this.locked && !this.isCollapsed);
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
 * Sets whether the frame is empty
 * @param {boolean} isEmpty True if frame is empty.
 * @package
 */
Blockly.Frame.prototype.setIsEmpty = function(isEmpty) {
  if (this.isEmpty_ === isEmpty) return;
  this.isEmpty_ = isEmpty;
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
 * Set the title of the frame.
 * @param {string} newTitle The new title of the frame.
 */
Blockly.Frame.prototype.setTitle = function(newTitle) {
  if(this.title != newTitle) {
    this.title = newTitle;
    this.titleInput_.value = this.title;
    Blockly.Events.fire(new Blockly.Events.FrameRetitle(this, newTitle));
  }
};

/**
 * Set the color of the frame.
 * @param {string} color The new color of the frame.
 */
Blockly.Frame.prototype.setColor = function(color) {
  if (this.color !== color) {
    this.fireFrameChange('color', {color: this.color}, {color: color});
    this.color = color;
    this.svgRect_.setAttribute('fill', `rgba(${color},0.12)`);
    this.collapseContent_.style.backgroundColor = `rgb(${this.color})`;
  }
};

/**
 * Toggle lock state.
 */
Blockly.Frame.prototype.triggerChangeLock = function() {
  this.fireFrameChange('locked', {locked: this.locked}, {locked: !this.locked});
  this.locked = !this.locked;
  if (this.locked) {
    this.frameGroup_.classList.add('blocklyFrameLocked');
    Object.values(this.blockDB_).forEach((block) => {
      block.getConnections_().forEach(c => c.hideAll());
    });
  } else {
    this.frameGroup_.classList.remove('blocklyFrameLocked');
    Object.values(this.blockDB_).forEach((block) => {
      block.getConnections_().forEach(c => c.unhideAll());
    });
  }
};

/**
 * Toggle collapsed state.
 */
Blockly.Frame.prototype.triggerChangeCollapsed = function() {
  if (Blockly.locked) return;
  if (this.locked) return;
  this.fireFrameChange('collapsed', {collapsed: this.isCollapsed}, {collapsed: !this.isCollapsed});
  this.isCollapsed = !this.isCollapsed;
  this.collapseContentForeignObject_.setAttribute("width", Math.abs(this.rect_.width));
  if (this.isCollapsed) {
    this.frameGroup_.classList.add('blocklyFrameCollapsed');
    this.blocksGroup_.style.display = 'none';
    this.resizeGroup_.style.display = 'none';
    this.updateCollapsedContent_();
    this.collapseContentForeignObjectBody_.appendChild(this.collapseContent_);
    Object.values(this.blockDB_).forEach((block) => {
      block.getConnections_().forEach(c => c.hideAll());
    });
    for (const key in this.workspace.commentDB_) {
      const comment = this.workspace.commentDB_[key];
      if (comment.block_ && comment.block_.isInFrame() === this) {
        comment.bubble_.bubbleGroup_.style.display = 'none';
      }
    }
  } else {
    this.frameGroup_.classList.remove('blocklyFrameCollapsed');
    this.blocksGroup_.style.display = 'block';
    this.resizeGroup_.style.display = 'block';
    if (this.collapseContent_.parentNode) {
      this.collapseContentForeignObjectBody_.removeChild(this.collapseContent_);
    }
    Object.values(this.blockDB_).forEach((block) => {
      block.getConnections_().forEach(c => c.unhideAll());
    });
    for (const key in this.workspace.commentDB_) {
      const comment = this.workspace.commentDB_[key];
      if (comment.block_ && comment.block_.isInFrame() === this) {
        comment.bubble_.bubbleGroup_.style.display = 'block';
      }
    }
  }
  const frameXY = this.getFrameGroupRelativeXY();
  const frameWH = this.getHeightWidth();
  const topBlocks = this.workspace.getTopBlocks();
  const topFrames = this.workspace.getTopFrames(true);
  const items = topBlocks.concat(topFrames);
  for (let i = 0, item; item = items[i]; i++) {
    if (item === this || item.frame_) continue;
    const itemXY =  item.getFrameGroupRelativeXY ? item.getFrameGroupRelativeXY() : item.getRelativeToSurfaceXY();
    const itemWH = item.getHeightWidth();
    const landscape = !(itemXY.x + itemWH.width < frameXY.x) && !(frameXY.x + frameWH.width < itemXY.x);
    const vertical = itemXY.y > frameXY.y;
    if (landscape && vertical) {
      let distance = this.isCollapsed ? (-(frameWH.height - 60)) : (frameWH.height - 60);
      if (this.isCollapsed && itemXY.y - frameXY.y < frameWH.height) {
        distance =  frameXY.y - itemXY.y + 100;
      }
      item.moveBy(0, distance);
    }
  }
  this.workspace.queueIntersectionCheck();
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
    const enableCleanup = !this.isCollapsed && Object.keys(this.blockDB_).length > 0;
    menuOptions.push(Blockly.ContextMenu.frameDuplicateOption(frame, e));
    menuOptions.push(Blockly.ContextMenu.frameCleanupOption(frame, enableCleanup));
    menuOptions.push(Blockly.ContextMenu.frameSetColorOption(frame, e));
    menuOptions.push(Blockly.ContextMenu.frameDeleteOption(frame, e));
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
 * Update the title box size
 */
Blockly.Frame.prototype.updateTitleBoxSize = function() {
  if(this.foreignObject_) {
    var height = this.titleInputHeight_;
    var width = this.getWidth();
    this.foreignObject_.setAttribute("height", height);
    this.foreignObject_.setAttribute("width", width);
    if (width < 40) {
      width = 40;
      this.foreignObjectBody_.classList.add("blocklyFrameForeignObjectBodyMini");
    } else {
      this.foreignObjectBody_.classList.remove("blocklyFrameForeignObjectBodyMini");
    }
    this.foreignObject_.style.setProperty('--frame-title-width', width + 'px');
    this.foreignObject_.style.setProperty('--frame-title-height', height + 'px');
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
  const ws = this.workspace;
  const oldBlocks = Object.assign({}, this.blockDB_);

  // Before deleting a block, it is necessary to fire the "delete Frame" event.
  // This will allow the block to fall back onto the frame when undoing the deletion of the frame.
  Blockly.Events.fire(new Blockly.Events.FrameDelete(this));

  for (const key in oldBlocks) {
    const block = oldBlocks[key];
    if (retainBlocks) {
      block.requestMoveOutFrame();
    } else {
      setTimeout(function() {
        // When a Frame is being destroyed, the blocks it contains may have already been destroyed.
        if (block.workspace) {
          ws.fireDeletionListeners(block);
        }
      });
      block.dispose(false, true);
    }
  }

  goog.dom.removeNode(this.frameGroup_);
  this.frameGroup_ = null;
  this.rect_ = null;
  this.svgRect_ = null;
  this.blockDB_ = {};
  this.workspace = null;

  // Remove from the list of top frames and the frame database.
  ws.removeTopFrame(this);
  ws.resizeContents();

  if (Blockly.selected === this) {
    Blockly.selected = null;
  }
};
