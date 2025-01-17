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
 * @fileoverview Object representing a UI bubble.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Blockly.Bubble');

goog.require('Blockly.Touch');
goog.require('Blockly.Workspace');
goog.require('goog.dom');
goog.require('goog.math.Coordinate');
goog.require('goog.userAgent');


/**
 * Class for UI bubble.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace on which to draw the
 *     bubble.
 * @param {!Element} content SVG content for the bubble.
 * @param {Element} shape SVG element to avoid eclipsing.
 * @param {!goog.math.Coordinate} anchorXY Absolute position of bubble's anchor
 *     point.
 * @param {?number} bubbleWidth Width of bubble, or null if not resizable.
 * @param {?number} bubbleHeight Height of bubble, or null if not resizable.
 * @constructor
 */
Blockly.Bubble = function(workspace, content, shape, anchorXY,
    bubbleWidth, bubbleHeight) {
  this.workspace_ = workspace;
  this.content_ = content;
  this.shape_ = shape;

  var angle = Blockly.Bubble.ARROW_ANGLE;
  if (this.workspace_.RTL) {
    angle = -angle;
  }
  this.arrow_radians_ = Blockly.utils.toRadians(angle);

  var canvas = workspace.getBubbleCanvas();
  canvas.appendChild(this.createDom_(content, !!(bubbleWidth && bubbleHeight)));

  this.setAnchorLocation(anchorXY);
  if (!bubbleWidth || !bubbleHeight) {
    var bBox = /** @type {SVGLocatable} */ (this.content_).getBBox();
    bubbleWidth = bBox.width + 2 * Blockly.Bubble.BORDER_WIDTH;
    bubbleHeight = bBox.height + 2 * Blockly.Bubble.BORDER_WIDTH;
  }
  this.setBubbleSize(bubbleWidth, bubbleHeight);

  // Render the bubble.
  this.positionBubble_();
  this.renderArrow_();
  this.rendered_ = true;

  if (!workspace.options.readOnly) {
    Blockly.bindEventWithChecks_(
        this.bubbleBack_, 'mousedown', this, this.bubbleMouseDown_);
    if (this.resizeGroup_) {
      Blockly.bindEventWithChecks_(
          this.resizeGroup_, 'mousedown', this, this.resizeMouseDown_);
    }
  }
};

/**
 * Width of the border around the bubble.
 */
Blockly.Bubble.BORDER_WIDTH = 6;

/**
 * Determines the thickness of the base of the arrow in relation to the size
 * of the bubble.  Higher numbers result in thinner arrows.
 */
Blockly.Bubble.ARROW_THICKNESS = 5;

/**
 * The number of degrees that the arrow bends counter-clockwise.
 */
Blockly.Bubble.ARROW_ANGLE = 20;

/**
 * The sharpness of the arrow's bend.  Higher numbers result in smoother arrows.
 */
Blockly.Bubble.ARROW_BEND = 4;

/**
 * Distance between arrow point and anchor point.
 */
Blockly.Bubble.ANCHOR_RADIUS = 8;

/**
 * Wrapper function called when a mouseUp occurs during a drag operation.
 * @type {Array.<!Array>}
 * @private
 */
Blockly.Bubble.onMouseUpWrapper_ = null;

/**
 * Wrapper function called when a mouseMove occurs during a drag operation.
 * @type {Array.<!Array>}
 * @private
 */
Blockly.Bubble.onMouseMoveWrapper_ = null;

/**
 * Function to call on resize of bubble.
 * @type {Function}
 */
Blockly.Bubble.prototype.resizeCallback_ = null;

/**
 * Stop binding to the global mouseup and mousemove events.
 * @private
 */
Blockly.Bubble.unbindDragEvents_ = function() {
  if (Blockly.Bubble.onMouseUpWrapper_) {
    Blockly.unbindEvent_(Blockly.Bubble.onMouseUpWrapper_);
    Blockly.Bubble.onMouseUpWrapper_ = null;
  }
  if (Blockly.Bubble.onMouseMoveWrapper_) {
    Blockly.unbindEvent_(Blockly.Bubble.onMouseMoveWrapper_);
    Blockly.Bubble.onMouseMoveWrapper_ = null;
  }
};

/*
 * Handle a mouse-up event while dragging a bubble's border or resize handle.
 * @param {!Event} e Mouse up event.
 * @private
 */
Blockly.Bubble.bubbleMouseUp_ = function(/*e*/) {
  Blockly.Touch.clearTouchIdentifier();
  Blockly.Bubble.unbindDragEvents_();
};

/**
 * Flag to stop incremental rendering during construction.
 * @private
 */
Blockly.Bubble.prototype.rendered_ = false;

/**
 * Absolute coordinate of anchor point, in workspace coordinates.
 * @type {goog.math.Coordinate}
 * @private
 */
Blockly.Bubble.prototype.anchorXY_ = null;

/**
 * Relative X coordinate of bubble with respect to the anchor's centre,
 * in workspace units.
 * In RTL mode the initial value is negated.
 * @private
 */
Blockly.Bubble.prototype.relativeLeft_ = 0;

/**
 * Relative Y coordinate of bubble with respect to the anchor's centre.
 * @private
 */
Blockly.Bubble.prototype.relativeTop_ = 0;

/**
 * Width of bubble.
 * @private
 */
Blockly.Bubble.prototype.width_ = 0;

/**
 * Height of bubble.
 * @private
 */
Blockly.Bubble.prototype.height_ = 0;

/**
 * Automatically position and reposition the bubble.
 * @private
 */
Blockly.Bubble.prototype.autoLayout_ = true;

/**
 * Create the bubble's DOM.
 * @param {!Element} content SVG content for the bubble.
 * @param {boolean} hasResize Add diagonal resize gripper if true.
 * @return {!Element} The bubble's SVG group.
 * @private
 */
Blockly.Bubble.prototype.createDom_ = function(content, hasResize) {
  /* Create the bubble.  Here's the markup that will be generated:
  <g>
    <g filter="url(#blocklyEmbossFilter837493)">
      <path d="... Z" />
      <rect class="blocklyDraggable" rx="8" ry="8" width="180" height="180"/>
    </g>
    <g transform="translate(165, 165)" class="blocklyResizeSE">
      <polygon points="0,15 15,15 15,0"/>
      <line class="blocklyResizeLine" x1="5" y1="14" x2="14" y2="5"/>
      <line class="blocklyResizeLine" x1="10" y1="14" x2="14" y2="10"/>
    </g>
    [...content goes here...]
  </g>
  */
  this.bubbleGroup_ = Blockly.utils.createSvgElement('g', {}, null);
  var filter =
      {'filter': 'url(#' + this.workspace_.options.embossFilterId + ')'};
  if (goog.userAgent.getUserAgentString().indexOf('JavaFX') != -1) {
    // Multiple reports that JavaFX can't handle filters.  UserAgent:
    // Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.44
    //     (KHTML, like Gecko) JavaFX/8.0 Safari/537.44
    // https://github.com/google/blockly/issues/99
    filter = {};
  }
  var bubbleEmboss = Blockly.utils.createSvgElement('g',
      filter, this.bubbleGroup_);
  this.bubbleArrow_ = Blockly.utils.createSvgElement('path', {}, bubbleEmboss);
  this.bubbleBack_ = Blockly.utils.createSvgElement('rect',
      {
        'class': 'blocklyDraggable',
        'x': 0,
        'y': 0,
        'rx': Blockly.Bubble.BORDER_WIDTH,
        'ry': Blockly.Bubble.BORDER_WIDTH
      },
      bubbleEmboss);
  if (hasResize) {
    this.resizeGroup_ = Blockly.utils.createSvgElement('g',
        {'class': this.workspace_.RTL ?
                  'blocklyResizeSW' : 'blocklyResizeSE'},
        this.bubbleGroup_);
    var resizeSize = 2 * Blockly.Bubble.BORDER_WIDTH;
    Blockly.utils.createSvgElement('polygon',
        {'points': '0,x x,x x,0'.replace(/x/g, resizeSize.toString())},
        this.resizeGroup_);
    Blockly.utils.createSvgElement('line',
        {
          'class': 'blocklyResizeLine',
          'x1': resizeSize / 3, 'y1': resizeSize - 1,
          'x2': resizeSize - 1, 'y2': resizeSize / 3
        }, this.resizeGroup_);
    Blockly.utils.createSvgElement('line',
        {
          'class': 'blocklyResizeLine',
          'x1': resizeSize * 2 / 3,
          'y1': resizeSize - 1,
          'x2': resizeSize - 1,
          'y2': resizeSize * 2 / 3
        }, this.resizeGroup_);
  } else {
    this.resizeGroup_ = null;
  }
  this.bubbleGroup_.appendChild(content);
  return this.bubbleGroup_;
};

/**
 * Return the root node of the bubble's SVG group.
 * @return {Element} The root SVG node of the bubble's group.
 */
Blockly.Bubble.prototype.getSvgRoot = function() {
  return this.bubbleGroup_;
};

/**
 * Expose the block's ID on the bubble's top-level SVG group.
 * @param {string} id ID of block.
 */
Blockly.Bubble.prototype.setSvgId = function(id) {
  if (this.bubbleGroup_.dataset) {
    this.bubbleGroup_.dataset.blockId = id;
  }
};

/**
 * Handle a mouse-down on bubble's border.
 * @param {!Event} e Mouse down event.
 * @private
 */
Blockly.Bubble.prototype.bubbleMouseDown_ = function(e) {
  var gesture = this.workspace_.getGesture(e);
  if (gesture) {
    gesture.handleBubbleStart(e, this);
  }
};

/**
 * Show the context menu for this bubble.
 * @param {!Event} _e Mouse event.
 * @private
 */
Blockly.Bubble.prototype.showContextMenu_ = function(_e) {
  // NOP on bubbles, but used by the bubble dragger to pass events to
  // workspace comments.
};

/**
 * Get whether this bubble is deletable or not.
 * @return {boolean} True if deletable.
 * @package
 */
Blockly.Bubble.prototype.isDeletable = function() {
  return false;
};

/**
 * Handle a mouse-down on bubble's resize corner.
 * @param {!Event} e Mouse down event.
 * @private
 */
Blockly.Bubble.prototype.resizeMouseDown_ = function(e) {
  this.promote_();
  Blockly.Bubble.unbindDragEvents_();
  if (Blockly.utils.isRightButton(e)) {
    // No right-click.
    e.stopPropagation();
    return;
  }
  // Left-click (or middle click)
  this.workspace_.startDrag(e, new goog.math.Coordinate(
      this.workspace_.RTL ? -this.width_ : this.width_, this.height_));

  Blockly.Bubble.onMouseUpWrapper_ = Blockly.bindEventWithChecks_(document,
      'mouseup', this, Blockly.Bubble.bubbleMouseUp_);
  Blockly.Bubble.onMouseMoveWrapper_ = Blockly.bindEventWithChecks_(document,
      'mousemove', this, this.resizeMouseMove_);
  Blockly.hideChaff();
  // This event has been handled.  No need to bubble up to the document.
  e.stopPropagation();
};

/**
 * Resize this bubble to follow the mouse.
 * @param {!Event} e Mouse move event.
 * @private
 */
Blockly.Bubble.prototype.resizeMouseMove_ = function(e) {
  this.autoLayout_ = false;
  var newXY = this.workspace_.moveDrag(e);
  this.setBubbleSize(this.workspace_.RTL ? -newXY.x : newXY.x, newXY.y);
  if (this.workspace_.RTL) {
    // RTL requires the bubble to move its left edge.
    this.positionBubble_();
  }
};

/**
 * Register a function as a callback event for when the bubble is resized.
 * @param {!Function} callback The function to call on resize.
 */
Blockly.Bubble.prototype.registerResizeEvent = function(callback) {
  this.resizeCallback_ = callback;
};

/**
 * Move this bubble to the top of the stack.
 * @return {!boolean} Whether or not the bubble has been moved.
 * @private
 */
Blockly.Bubble.prototype.promote_ = function() {
  var svgGroup = this.bubbleGroup_.parentNode;
  if (svgGroup.lastChild !== this.bubbleGroup_) {
    svgGroup.appendChild(this.bubbleGroup_);
    return true;
  }
  return false;
};

/**
 * Notification that the anchor has moved.
 * Update the arrow and bubble accordingly.
 * @param {!goog.math.Coordinate} xy Absolute location.
 */
Blockly.Bubble.prototype.setAnchorLocation = function(xy) {
  this.anchorXY_ = xy;
  if (this.rendered_) {
    this.positionBubble_();
  }
};

/**
 * Position the bubble so that it does not fall off-screen.
 * @private
 */
Blockly.Bubble.prototype.layoutBubble_ = function() {
  // Compute the preferred bubble location.
  var relativeLeft = -this.width_ / 4;
  var relativeTop = -this.height_ - Blockly.BlockSvg.MIN_BLOCK_Y;
  // Prevent the bubble from being off-screen.
  var metrics = this.workspace_.getMetrics();
  metrics.viewWidth /= this.workspace_.scale;
  metrics.viewLeft /= this.workspace_.scale;
  var anchorX = this.anchorXY_.x;
  if (this.workspace_.RTL) {
    if (anchorX - metrics.viewLeft - relativeLeft - this.width_ <
        Blockly.Scrollbar.scrollbarThickness) {
      // Slide the bubble right until it is onscreen.
      relativeLeft = anchorX - metrics.viewLeft - this.width_ -
        Blockly.Scrollbar.scrollbarThickness;
    } else if (anchorX - metrics.viewLeft - relativeLeft >
               metrics.viewWidth) {
      // Slide the bubble left until it is onscreen.
      relativeLeft = anchorX - metrics.viewLeft - metrics.viewWidth;
    }
  } else {
    if (anchorX + relativeLeft < metrics.viewLeft) {
      // Slide the bubble right until it is onscreen.
      relativeLeft = metrics.viewLeft - anchorX;
    } else if (metrics.viewLeft + metrics.viewWidth <
        anchorX + relativeLeft + this.width_ +
        Blockly.BlockSvg.SEP_SPACE_X +
        Blockly.Scrollbar.scrollbarThickness) {
      // Slide the bubble left until it is onscreen.
      relativeLeft = metrics.viewLeft + metrics.viewWidth - anchorX -
          this.width_ - Blockly.Scrollbar.scrollbarThickness;
    }
  }
  if (this.anchorXY_.y + relativeTop < metrics.viewTop) {
    // Slide the bubble below the block.
    var bBox = /** @type {SVGLocatable} */ (this.shape_).getBBox();
    relativeTop = bBox.height;
  }
  this.relativeLeft_ = relativeLeft;
  this.relativeTop_ = relativeTop;
};

/**
 * Move the bubble to a location relative to the anchor's centre.
 * @private
 */
Blockly.Bubble.prototype.positionBubble_ = function() {
  var left = this.anchorXY_.x;
  if (this.workspace_.RTL) {
    left -= this.relativeLeft_ ;
  } else {
    left += this.relativeLeft_;
  }
  var top = this.relativeTop_ + this.anchorXY_.y;
  this.moveTo(left, top);
};

/**
 * Move the bubble group to the specified location in workspace coordinates.
 * @param {number} x The x position to move to.
 * @param {number} y The y position to move to.
 * @package
 */
Blockly.Bubble.prototype.moveTo = function(x, y) {
  this.bubbleGroup_.setAttribute('transform', 'translate(' + x + ',' + y + ')');
};

/**
 * Get the dimensions of this bubble.
 * @return {!Object} Object with width and height properties.
 */
Blockly.Bubble.prototype.getBubbleSize = function() {
  return {width: this.width_, height: this.height_};
};

/**
 * Size this bubble.
 * @param {number} width Width of the bubble.
 * @param {number} height Height of the bubble.
 */
Blockly.Bubble.prototype.setBubbleSize = function(width, height) {
  var doubleBorderWidth = 2 * Blockly.Bubble.BORDER_WIDTH;
  // Minimum size of a bubble.
  width = Math.max(width, doubleBorderWidth + 45);
  height = Math.max(height, doubleBorderWidth + 20);
  this.width_ = width;
  this.height_ = height;
  this.bubbleBack_.setAttribute('width', width);
  this.bubbleBack_.setAttribute('height', height);
  if (this.resizeGroup_) {
    if (this.workspace_.RTL) {
      // Mirror the resize group.
      var resizeSize = 2 * Blockly.Bubble.BORDER_WIDTH;
      this.resizeGroup_.setAttribute('transform', 'translate(' +
          resizeSize + ',' + (height - doubleBorderWidth) + ') scale(-1 1)');
    } else {
      this.resizeGroup_.setAttribute('transform', 'translate(' +
          (width - doubleBorderWidth) + ',' +
          (height - doubleBorderWidth) + ')');
    }
  }
  if (this.rendered_) {
    if (this.autoLayout_) {
      this.layoutBubble_();
    }
    this.positionBubble_();
    this.renderArrow_();
  }
  // Allow the contents to resize.
  if (this.resizeCallback_) {
    this.resizeCallback_();
  }
};

/**
 * Draw the arrow between the bubble and the origin.
 * @private
 */
Blockly.Bubble.prototype.renderArrow_ = function() {
  var steps = [];
  // Find the relative coordinates of the center of the bubble.
  var relBubbleX = this.width_ / 2;
  var relBubbleY = this.height_ / 2;
  // Find the relative coordinates of the center of the anchor.
  var relAnchorX = -this.relativeLeft_;
  var relAnchorY = -this.relativeTop_;
  if (relBubbleX == relAnchorX && relBubbleY == relAnchorY) {
    // Null case.  Bubble is directly on top of the anchor.
    // Short circuit this rather than wade through divide by zeros.
    steps.push('M ' + relBubbleX + ',' + relBubbleY);
  } else {
    // Compute the angle of the arrow's line.
    var rise = relAnchorY - relBubbleY;
    var run = relAnchorX - relBubbleX;
    if (this.workspace_.RTL) {
      run *= -1;
    }
    var hypotenuse = Math.sqrt(rise * rise + run * run);
    var angle = Math.acos(run / hypotenuse);
    if (rise < 0) {
      angle = 2 * Math.PI - angle;
    }
    // Compute a line perpendicular to the arrow.
    var rightAngle = angle + Math.PI / 2;
    if (rightAngle > Math.PI * 2) {
      rightAngle -= Math.PI * 2;
    }
    var rightRise = Math.sin(rightAngle);
    var rightRun = Math.cos(rightAngle);

    // Calculate the thickness of the base of the arrow.
    var bubbleSize = this.getBubbleSize();
    var thickness = (bubbleSize.width + bubbleSize.height) /
                    Blockly.Bubble.ARROW_THICKNESS;
    thickness = Math.min(thickness, bubbleSize.width, bubbleSize.height) / 4;

    // Back the tip of the arrow off of the anchor.
    var backoffRatio = 1 - Blockly.Bubble.ANCHOR_RADIUS / hypotenuse;
    relAnchorX = relBubbleX + backoffRatio * run;
    relAnchorY = relBubbleY + backoffRatio * rise;

    // Coordinates for the base of the arrow.
    var baseX1 = relBubbleX + thickness * rightRun;
    var baseY1 = relBubbleY + thickness * rightRise;
    var baseX2 = relBubbleX - thickness * rightRun;
    var baseY2 = relBubbleY - thickness * rightRise;

    // Distortion to curve the arrow.
    var swirlAngle = angle + this.arrow_radians_;
    if (swirlAngle > Math.PI * 2) {
      swirlAngle -= Math.PI * 2;
    }
    var swirlRise = Math.sin(swirlAngle) *
        hypotenuse / Blockly.Bubble.ARROW_BEND;
    var swirlRun = Math.cos(swirlAngle) *
        hypotenuse / Blockly.Bubble.ARROW_BEND;

    steps.push('M' + baseX1 + ',' + baseY1);
    steps.push('C' + (baseX1 + swirlRun) + ',' + (baseY1 + swirlRise) +
               ' ' + relAnchorX + ',' + relAnchorY +
               ' ' + relAnchorX + ',' + relAnchorY);
    steps.push('C' + relAnchorX + ',' + relAnchorY +
               ' ' + (baseX2 + swirlRun) + ',' + (baseY2 + swirlRise) +
               ' ' + baseX2 + ',' + baseY2);
  }
  steps.push('z');
  this.bubbleArrow_.setAttribute('d', steps.join(' '));
};

/**
 * Change the colour of a bubble.
 * @param {string} hexColour Hex code of colour.
 */
Blockly.Bubble.prototype.setColour = function(hexColour) {
  this.bubbleBack_.setAttribute('fill', hexColour);
  this.bubbleArrow_.setAttribute('fill', hexColour);
};

/**
 * Change the display of a bubble.
 * @param {string} value Block or none.
 */
Blockly.Bubble.prototype.setDisplay = function(value) {
  this.bubbleGroup_.style.display = value;
};

/**
 * Dispose of this bubble.
 */
Blockly.Bubble.prototype.dispose = function() {
  Blockly.Bubble.unbindDragEvents_();
  // Dispose of and unlink the bubble.
  goog.dom.removeNode(this.bubbleGroup_);
  this.bubbleGroup_ = null;
  this.bubbleArrow_ = null;
  this.bubbleBack_ = null;
  this.resizeGroup_ = null;
  this.workspace_ = null;
  this.content_ = null;
  this.shape_ = null;
};

/**
 * Move this bubble during a drag, taking into account whether or not there is
 * a drag surface.
 * @param {?Blockly.BlockDragSurfaceSvg} dragSurface The surface that carries
 *     rendered items during a drag, or null if no drag surface is in use.
 * @param {!goog.math.Coordinate} newLoc The location to translate to, in
 *     workspace coordinates.
 * @package
 */
Blockly.Bubble.prototype.moveDuringDrag = function(dragSurface, newLoc) {
  if (dragSurface) {
    dragSurface.translateSurface(newLoc.x, newLoc.y);
  } else {
    this.moveTo(newLoc.x, newLoc.y);
  }
  if (this.workspace_.RTL) {
    this.relativeLeft_ = this.anchorXY_.x - newLoc.x - this.width_;
  } else {
    this.relativeLeft_ = newLoc.x - this.anchorXY_.x;
  }
  this.relativeTop_ = newLoc.y - this.anchorXY_.y;
  this.renderArrow_();
};

/**
 * Return the coordinates of the top corner of this bubble's starting edge (e.g.
 * top left corner in LTR and top right corner in RTL) relative
 * to the drawing surface's origin (0,0), in workspace units.
 * @return {!goog.math.Coordinate} Object with .x and .y properties.
 */
Blockly.Bubble.prototype.getRelativeToSurfaceXY = function() {
  return new goog.math.Coordinate(
      this.workspace_.RTL ? this.anchorXY_.x - this.relativeLeft_ : this.anchorXY_.x + this.relativeLeft_,
      this.anchorXY_.y + this.relativeTop_);
};

/**
 * Set whether auto-layout of this bubble is enabled.  The first time a bubble
 * is shown it positions itself to not cover any blocks.  Once a user has
 * dragged it to reposition, it renders where the user put it.
 * @param {boolean} enable True if auto-layout should be enabled, false
 *     otherwise.
 * @package
 */
Blockly.Bubble.prototype.setAutoLayout = function(enable) {
  this.autoLayout_ = enable;
};
