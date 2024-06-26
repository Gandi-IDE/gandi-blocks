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

/**
 * @fileoverview Methods for dragging a block visually.
 * @author fenichel@google.com (Rachel Fenichel)
 */
'use strict';

goog.provide('Blockly.BlockDragger');

goog.require('Blockly.BlockAnimations');
goog.require('Blockly.Events.BlockMove');
goog.require('Blockly.Events.DragBlockOutside');
goog.require('Blockly.Events.EndBlockDrag');
goog.require('Blockly.InsertionMarkerManager');

goog.require('goog.math.Coordinate');
goog.require('goog.asserts');



/**
 * Class for a block dragger.  It moves blocks around the workspace when they
 * are being dragged by a mouse or touch.
 * @param {!Blockly.BlockSvg} block The block to drag.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace to drag on.
 * @constructor
 */
Blockly.BlockDragger = function(block, workspace) {
  /**
   * The top block in the stack that is being dragged.
   * @type {!Blockly.BlockSvg}
   * @private
   */
  this.draggingBlock_ = block;

  /**
   * The workspace on which the block is being dragged.
   * @type {!Blockly.WorkspaceSvg}
   * @private
   */
  this.workspace_ = workspace;

  /**
   * Object that keeps track of connections on dragged blocks.
   * @type {!Blockly.InsertionMarkerManager}
   * @private
   */
  this.draggedConnectionManager_ = new Blockly.InsertionMarkerManager(
      this.draggingBlock_);

  /**
   * Which delete area the mouse pointer is over, if any.
   * One of {@link Blockly.DELETE_AREA_TRASH},
   * {@link Blockly.DELETE_AREA_TOOLBOX}, or {@link Blockly.DELETE_AREA_NONE}.
   * @type {?number}
   * @private
   */
  this.deleteArea_ = null;

  /**
   * Whether the block would be deleted if dropped immediately.
   * @type {boolean}
   * @private
   */
  this.wouldDeleteBlock_ = false;

  /**
   * Whether the currently dragged block is outside of the workspace. Keep
   * track so that we can fire events only when this changes.
   * @type {boolean}
   * @private
   */
  this.wasOutside_ = false;

  /**
   * The location of the top left corner of the dragging block at the beginning
   * of the drag in workspace coordinates.
   * @type {!goog.math.Coordinate}
   * @private
   */
  this.startXY_ = this.draggingBlock_.getRelativeToSurfaceXY(true);

  const frame = this.draggingBlock_.getSelfFrame();
  /**
   * The ID of the frame associated with the dragging block, if available.
   * @type {?string}
   * @private
   */
  this.startFrame_ = frame ? frame.id : undefined;

  /**
   * A list of all of the icons (comment, warning, and mutator) that are
   * on this block and its descendants.  Moving an icon moves the bubble that
   * extends from it if that bubble is open.
   * @type {Array.<!Object>}
   * @private
   */
  this.dragIconData_ = this.draggingBlock_.initIconData();
};

/**
 * Sever all links from this object.
 * @package
 */
Blockly.BlockDragger.prototype.dispose = function() {
  this.draggingBlock_ = null;
  this.workspace_ = null;
  this.startWorkspace_ = null;
  this.dragIconData_.length = 0;

  if (this.draggedConnectionManager_) {
    this.draggedConnectionManager_.dispose();
    this.draggedConnectionManager_ = null;
  }
};


/**
 * Start dragging a block.  This includes moving it to the drag surface.
 * @param {!Event} e The most recent move event.
 * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
 *     moved from the position at mouse down, in pixel units.
 * @package
 */
Blockly.BlockDragger.prototype.startBlockDrag = function(e, currentDragDeltaXY) {
  this.rootDiv = document.getElementsByClassName('injectionDiv')[0];
  if(Blockly.locked) return;
  if (!Blockly.Events.getGroup()) {
    Blockly.Events.setGroup(true);
  }

  this.workspace_.setResizesEnabled(false);
  this.workspace_.setDraggingBlock(true);
  Blockly.BlockAnimations.disconnectUiStop();

  var frame = this.draggingBlock_.getTopFrame();
  if (frame) {
    this.startXY_ = goog.math.Coordinate.sum(this.startXY_, frame.getBlockGroupRelativeXY());
  }
  
  if (this.draggingBlock_.getParent()) {
    this.draggingBlock_.unplug();
    var delta = this.pixelsToWorkspaceUnits_(currentDragDeltaXY);
    var newLoc = goog.math.Coordinate.sum(this.startXY_, delta);
    this.draggingBlock_.translate(newLoc.x, newLoc.y);
    Blockly.BlockAnimations.disconnectUiEffect(this.draggingBlock_);
  }
  this.draggingBlock_.setDragging(true);
  // For future consideration: we may be able to put moveToDragSurface inside
  // the block dragger, which would also let the block not track the block drag
  // surface.
  this.draggingBlock_.moveToDragSurface_(e);

  var toolbox = this.workspace_.getToolbox();
  if (toolbox) {
    var style = this.draggingBlock_.isDeletable() ? 'blocklyToolboxDelete' :
        'blocklyToolboxGrab';
    toolbox.addStyle(style);
    if (!this.workspace_.isDeleteArea(e)) {
      toolbox.addStyle('dragStartInWorkspace');
    }
    if (this.workspace_.options.nonStickyFlyout) {
      if (toolbox.getFlyout()) {
        toolbox.resetScrollToHideConditions();
        toolbox.getFlyout().setVisible(false);
      }
    }
  }
};

/**
 * Execute a step of block dragging, based on the given event.  Update the
 * display accordingly.
 * @param {!Event} e The most recent move event.
 * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
 *     moved from the position at the start of the drag, in pixel units.
 * @package
 * @return {boolean} True if the event should be propagated, false if not.
 */
Blockly.BlockDragger.prototype.dragBlock = function(e, currentDragDeltaXY) {
  var delta = this.pixelsToWorkspaceUnits_(currentDragDeltaXY);
  var newLoc = goog.math.Coordinate.sum(this.startXY_, delta);
  this.draggingBlock_.moveDuringDrag(newLoc);
  this.dragIcons_(delta);

  this.deleteArea_ = this.workspace_.isDeleteArea(e);
  var isOutside = Blockly.utils.isDom(e.target) ? !this.rootDiv.contains(e.target) : false;
  this.draggedConnectionManager_.update(delta, this.deleteArea_, isOutside);
  if (isOutside !== this.wasOutside_) {
    this.fireDragOutsideEvent_(isOutside);
    this.wasOutside_ = isOutside;
  }

  this.updateCursorDuringBlockDrag_(isOutside);
  return isOutside;
};

/**
 * Finish a block drag and put the block back on the workspace.
 * @param {!Event} e The mouseup/touchend event.
 * @param {!goog.math.Coordinate} currentDragDeltaXY How far the pointer has
 *     moved from the position at the start of the drag, in pixel units.
 * @param {?Function} checkDraggingBlockAndDraggedConnection Check that the data and
 *     connections of the drag blocks are up to date and available
 * @package
 */
Blockly.BlockDragger.prototype.endBlockDrag = function(e, currentDragDeltaXY, checkDraggingBlockAndDraggedConnection) {
  // Make sure internal state is fresh.
  this.dragBlock(e, currentDragDeltaXY);
  let delta = this.pixelsToWorkspaceUnits_(currentDragDeltaXY);
  if (this.draggingBlock_ && this.draggingBlock_.temporaryBatchElements) {
    // Dealing with the hidden issue of dragging block style separately
    let setDragBlockCommentStyleBlock = this.draggingBlock_;
    do {
      if (setDragBlockCommentStyleBlock.comment) {
        setDragBlockCommentStyleBlock.comment.bubble_.bubbleGroup_.setAttribute(
            "style",
            "display: block"
        );
      }
      setDragBlockCommentStyleBlock =
        ((setDragBlockCommentStyleBlock.nextConnection || {}).targetConnection || {})
            .sourceBlock_;
    } while (setDragBlockCommentStyleBlock);

    const batchHeadBlocks = this.draggingBlock_.temporaryBatchElements[0]
        .filter((it) => it.id !== this.draggingBlock_.id);
    const batchedFrames = this.draggingBlock_.temporaryBatchElements[1];
    Blockly.utils.moveBatchedElements(delta, [batchHeadBlocks, batchedFrames]);
  }

  var isOutside = this.wasOutside_;
  this.fireEndDragEvent_(isOutside);
  this.draggingBlock_.setMouseThroughStyle(false);
  Blockly.BlockAnimations.disconnectUiStop();

  var newLoc = goog.math.Coordinate.sum(this.startXY_, delta);
  this.draggingBlock_.moveOffDragSurface_(newLoc);

  // Scratch-specific: note possible illegal definition deletion for rollback below.
  var isDeletingProcDef = this.wouldDeleteBlock_ &&
      (this.draggingBlock_.type == Blockly.PROCEDURES_DEFINITION_BLOCK_TYPE);
  var deletedProcBlock = null;
  if(isDeletingProcDef) {
    // maybeDeleteBlock_() will dispose the draggingBlock_, so we need to save it
    deletedProcBlock = this.draggingBlock_.childBlocks_[0];
  }
  var deleted = this.maybeDeleteBlock_();

  const draggingBlockId = this.draggingBlock_.id;
  if (!deleted) {
    // These are expensive and don't need to be done if we're deleting.
    this.draggingBlock_.moveConnections_(delta.x, delta.y);
    this.draggingBlock_.setDragging(false);

    // When multiple people collaborate on editing, the block fragment being dragged may have been modified
    // by others during the dragging process.
    // Must be called before generating a new relationship between Frame and Blocks.
    if(checkDraggingBlockAndDraggedConnection) {
      checkDraggingBlockAndDraggedConnection();
    }

    if (this.draggingBlock_.workspace) {
      // It is possible that the draggingBlock has been replaced due to the previous operation
      if (this.draggingBlock_.id === draggingBlockId) {
        this.fireMoveEvent_();
      }
      if (this.draggedConnectionManager_.wouldConnectBlock()) {
        // Applying connections also rerenders the relevant blocks.
        this.draggedConnectionManager_.applyConnections();
      } else {
        this.draggingBlock_.render();
      }
  
      this.draggingBlock_.scheduleSnapAndBump();
    }

    // Recompute the relationships between blocks and frames.
    this.workspace_.resetFrameAndTopBlocksMap();
  } else {
    // When multiple people collaborate on editing, the block fragment being dragged may have been modified
    // by others during the dragging process.
    // Must be called before generating a new relationship between Frame and Blocks.
    if(checkDraggingBlockAndDraggedConnection) {
      checkDraggingBlockAndDraggedConnection();
    }
    this.workspace_.resetFrameAndTopBlocksMap();
  }
  // The data of dragIconData must be reset after executing the fireMoveEvent.
  this.dragIconData_ = [];
  this.workspace_.setResizesEnabled(true);
  this.workspace_.setDraggingBlock(false);

  var toolbox = this.workspace_.getToolbox();
  if (toolbox) {
    var style = this.draggingBlock_.isDeletable() ? 'blocklyToolboxDelete' :
        'blocklyToolboxGrab';
    toolbox.removeStyle(style);
    toolbox.removeStyle('dragStartInWorkspace');
  }
  Blockly.Events.setGroup(false);
  var ws = this.workspace_;


  // clear draggingBlock_ temporaryBatchElements
  this.draggingBlock_.temporaryBatchElements = null;

  if (isOutside) {
    // Reset a drag to the outside of scratch-blocks
    setTimeout(function() {
      ws.undo();
    });
    return;
  }

  var deletedBlock = this.draggingBlock_;
  var fireDeletionListeners = function(undoFunc) {
    if (deleted) {
      ws.fireDeletionListeners(deletedBlock, undoFunc);
    }
  };

  // Scratch-specific: roll back deletes that create call blocks with defines.
  // Have to wait for connections to be re-established, so put in setTimeout.
  // Only do this if we deleted a proc def.
  if (isDeletingProcDef && deletedProcBlock) {
    var deletedProcCode = deletedProcBlock.getProcCode();
    setTimeout(function() {
      var allBlocks = ws.getAllBlocks();
      for (var i = 0; i < allBlocks.length; i++) {
        var block = allBlocks[i];
        if (
          block.type == Blockly.PROCEDURES_CALL_BLOCK_TYPE
          ||
          block.type == Blockly.PROCEDURES_CALL_WITH_RETURN_BLOCK_TYPE
        ) {
          var procCode = block.getProcCode();
          // Check for call blocks with no associated define block.
          if (deletedProcCode === procCode && !Blockly.Procedures.getDefineBlock(procCode, ws)) {
            alert(Blockly.Msg.PROCEDURE_USED);
            ws.undo();
            return; // There can only be one define deletion at a time.
          }
        }
      }

      //CCW: global block delete
      if (deletedProcBlock.isGlobal_) {
        var allTargets = Blockly.getAllTargets();
        for (var i = 0; i < allTargets.length; i++) {
          var target = allTargets[i];
          for (var blockId in target.blocks._blocks) {
            var block = target.blocks._blocks[blockId];
            if (
              block.opcode == Blockly.PROCEDURES_CALL_BLOCK_TYPE
              ||
              block.opcode == Blockly.PROCEDURES_CALL_WITH_RETURN_BLOCK_TYPE
            ) {
              var procCode = block.mutation.proccode;
              if (deletedProcCode === procCode && !Blockly.Procedures.getDefineBlock(procCode, ws)) {
                alert(Blockly.Msg.Global_PROCEDURE_USED.replace('%1', target.getName()));
                ws.undo();
                return;
              }
            }
          }
        }
      }

      // The proc deletion was valid, update the toolbox.
      ws.refreshToolboxSelection_();

      fireDeletionListeners(function() {
        ws.undo();
        ws.refreshToolboxSelection_();
      });
    });

    return;
  }

  setTimeout(function(){
    fireDeletionListeners();
  });
};

/**
 * Fire an event when the dragged blocks move outside or back into the blocks workspace
 * @param {?boolean} isOutside True if the drag is going outside the visible area.
 * @private
 */
Blockly.BlockDragger.prototype.fireDragOutsideEvent_ = function(isOutside) {
  var event = new Blockly.Events.DragBlockOutside(this.draggingBlock_);
  event.isOutside = isOutside;
  Blockly.Events.fire(event);
};

/**
 * Fire an end drag event at the end of a block drag.
 * @param {?boolean} isOutside True if the drag is going outside the visible area.
 * @private
 */
Blockly.BlockDragger.prototype.fireEndDragEvent_ = function(isOutside) {
  if(Blockly.locked) return;
  var event = new Blockly.Events.EndBlockDrag(this.draggingBlock_, isOutside);
  Blockly.Events.fire(event);
};

/**
 * Fire a move event at the end of a block drag.
 * @private
 */
Blockly.BlockDragger.prototype.fireMoveEvent_ = function() {
  var event = new Blockly.Events.BlockMove(this.draggingBlock_);
  event.oldCoordinate = this.startXY_;
  event.recordNew();
  Blockly.Events.fire(event);
  this.draggingBlock_.fireIconsMoveEvent(this.dragIconData_);
};

/**
 * Shut the trash can and, if necessary, delete the dragging block.
 * Should be called at the end of a block drag.
 * @return {boolean} whether the block was deleted.
 * @private
 */
Blockly.BlockDragger.prototype.maybeDeleteBlock_ = function() {
  var trashcan = this.workspace_.trashcan;

  if (this.wouldDeleteBlock_) {
    if (trashcan) {
      goog.Timer.callOnce(trashcan.close, 100, trashcan);
    }
    // Fire a move event, so we know where to go back to for an undo.
    this.fireMoveEvent_();
    this.draggingBlock_.dispose(false, true);
    // delete all batch elements
    if(this.draggingBlock_.temporaryBatchElements) {
      const batchHeadBlocks = this.draggingBlock_.temporaryBatchElements[0]
          .filter((it) => it.id !== this.draggingBlock_.id);
      batchHeadBlocks.forEach(bl => {
        bl.dispose(false, true);
      });
      this.draggingBlock_.temporaryBatchElements[1].forEach((frame) => {
        frame.dispose();
      });
    }
  } else if (trashcan) {
    // Make sure the trash can is closed.
    trashcan.close();
  }
  return this.wouldDeleteBlock_;
};

/**
 * Update the cursor (and possibly the trash can lid) to reflect whether the
 * dragging block would be deleted if released immediately.
 * @param {boolean} isOutside True if the cursor is outside of the blocks workspace
 * @private
 */
Blockly.BlockDragger.prototype.updateCursorDuringBlockDrag_ = function(isOutside) {
  this.wouldDeleteBlock_ = this.draggedConnectionManager_.wouldDeleteBlock();
  var trashcan = this.workspace_.trashcan;
  if (this.wouldDeleteBlock_) {
    this.draggingBlock_.setDeleteStyle(true);
    if (this.deleteArea_ == Blockly.DELETE_AREA_TRASH && trashcan) {
      trashcan.setOpen_(true);
    }
  } else {
    this.draggingBlock_.setDeleteStyle(false);
    if (trashcan) {
      trashcan.setOpen_(false);
    }
  }

  if (isOutside) {
    // Let mouse events through to GUI
    this.draggingBlock_.setMouseThroughStyle(true);
  } else {
    this.draggingBlock_.setMouseThroughStyle(false);
  }
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
Blockly.BlockDragger.prototype.pixelsToWorkspaceUnits_ = function(pixelCoord) {
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

/**
 * Move all of the icons connected to this drag.
 * @param {!goog.math.Coordinate} dxy How far to move the icons from their
 *     original positions, in workspace units.
 * @private
 */
Blockly.BlockDragger.prototype.dragIcons_ = function(dxy) {
  // Moving icons moves their associated bubbles.
  for (var i = 0; i < this.dragIconData_.length; i++) {
    var data = this.dragIconData_[i];
    data.icon.setIconLocation(goog.math.Coordinate.sum(data.location, dxy));
  }
};
