/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2017 Google Inc.
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

goog.provide('Blockly.FrameDragger');

goog.require('goog.math.Coordinate');



/**
 * Class for a frame dragger.  It moves frame around the workspace when they
 * are being dragged by a mouse or touch.
 * @param {!Blockly.Frame} frame The frame to drag.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace to drag on.
 * @constructor
 */
Blockly.FrameDragger = function(frame, workspace) {
  /**
   * The top frame in the stack that is being dragged.
   * @type {!Blockly.Frame}
   * @private
   */
  this.draggingFrame_ = frame;

  /**
   * The workspace on which the frame is being dragged.
   * @type {!Blockly.WorkspaceSvg}
   * @private
   */
  this.workspace_ = workspace;

  /**
   * Whether the currently dragged frame is outside of the workspace. Keep
   * track so that we can fire events only when this changes.
   * @type {boolean}
   * @private
   */
  this.wasOutside_ = false;

  /**
   * The location of the top left corner of the dragging frame at the beginning
   * of the drag in workspace coordinates.
   * @type {!goog.math.Coordinate}
   * @private
   */
  this.startXY_ = this.draggingFrame_.getFrameGroupRelativeXY();
};

/**
 * Sever all links from this object.
 * @package
 */
Blockly.FrameDragger.prototype.dispose = function() {
  this.draggingFrame_ = null;
  this.workspace_ = null;
};


/**
 * Start dragging a frame. This includes moving it to the drag surface.
 * @param {!Event} e The most recent move event.
 * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
 *     moved from the position at mouse down, in pixel units.
 * @package
 */
Blockly.FrameDragger.prototype.startFrameDrag = function() {
  this.rootDiv = document.getElementsByClassName('injectionDiv')[0];
  if(Blockly.locked) return;

  if (!Blockly.Events.getGroup()) {
    Blockly.Events.setGroup(true);
  }

  this.draggingFrame_.oldBoundingFrameRect_ = this.draggingFrame_.getBoundingFrameRect();
  this.workspace_.setFrameToFront(this.draggingFrame_);
  this.workspace_.setResizesEnabled(false);
  this.draggingFrame_.setDragging(true);
};

/**
 * Execute a step of frame dragging, based on the given event.  Update the
 * display accordingly.
 * @param {!Event} e The most recent move event.
 * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
 *     moved from the position at the start of the drag, in pixel units.
 * @package
 * @return {boolean} True if the event should be propagated, false if not.
 */
Blockly.FrameDragger.prototype.dragFrame = function(e, currentDragDeltaXY) {
  var delta = this.pixelsToWorkspaceUnits_(currentDragDeltaXY);
  var newLoc = goog.math.Coordinate.sum(this.startXY_, delta);
  this.draggingFrame_.moveDuringDrag(newLoc);
  var isOutside = Blockly.utils.isDom(e.target) ? !this.rootDiv.contains(e.target) : false;
  if (isOutside !== this.wasOutside_) {
    this.wasOutside_ = isOutside;
  }
  return isOutside;
};

/**
 * Finish a frame drag and put the frame back on the workspace.
 * @param {!Event} e The mouseup/touchend event.
 * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
 *     moved from the position at the start of the drag, in pixel units.
 * @package
 */
Blockly.FrameDragger.prototype.endFrameDrag = function(e, currentDragDeltaXY) {
  // Make sure internal state is fresh.
  this.dragFrame(e, currentDragDeltaXY);

  var delta = this.pixelsToWorkspaceUnits_(currentDragDeltaXY);
  var blocks = Object.values(this.draggingFrame_.blockDB_);
  for (let index = 0; index < blocks.length; index++) {
    blocks[index].moveConnections_(delta.x, delta.y);
  }
  var isOutside = this.wasOutside_;
  this.fireEndDragEvent_(isOutside);
  this.draggingFrame_.setMouseThroughStyle(false);
  this.draggingFrame_.setDragging(false);
  this.workspace_.setResizesEnabled(true);
  this.workspace_.resetFrameAndTopBlocksMap();
  Blockly.Events.setGroup(false);
};

/**
 * Fire an end drag event at the end of a frame drag.
 * @param {?boolean} isOutside True if the drag is going outside the visible area.
 * @private
 */
Blockly.FrameDragger.prototype.fireEndDragEvent_ = function() {
  if(Blockly.locked) return;
  var oldRect = this.draggingFrame_.oldBoundingFrameRect_;
  var newRect = this.draggingFrame_.getBoundingFrameRect();
  var event = new Blockly.Events.FrameChange(this.draggingFrame_, oldRect, newRect);
  Blockly.Events.fire(event);
};

/**
 * Convert a coordinate object from pixels to workspace units, including a
 * correction for mutator workspaces.
 * This function does not consider differing origins.  It simply scales the
 * input's x and y values.
 * @param {!goog.math.Coordinate} pixelCoord A coordinate with x and y values
 *     in css pixel units.
 * @return {!goog.math.Coordinate} The input coordinate divided by the workspace
 *     scale.
 * @private
 */
Blockly.FrameDragger.prototype.pixelsToWorkspaceUnits_ = function(pixelCoord) {
  var result = new goog.math.Coordinate(pixelCoord.x / this.workspace_.scale,
      pixelCoord.y / this.workspace_.scale);
  if (this.workspace_.isMutator) {
    // If we're in a mutator, its scale is always 1, purely because of some
    // oddities in our rendering optimizations.  The actual scale is the same as
    // the scale on the parent workspace.
    // Fix that for dragging.
    var mainScale = this.workspace_.options.parentWorkspace.scale;
    result = result.scale(1 / mainScale);
  }
  return result;
};
