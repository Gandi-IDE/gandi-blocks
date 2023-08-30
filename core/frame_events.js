/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2018 Google Inc.
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

goog.provide('Blockly.Events.FrameBase');
goog.provide('Blockly.Events.FrameCreate');
goog.provide('Blockly.Events.FrameDelete');
goog.provide('Blockly.Events.FrameRetitle');
goog.provide('Blockly.Events.DragFrameOutside');
goog.provide('Blockly.Events.EndFrameDrag');
goog.provide('Blockly.Events.FrameChange');

goog.require('Blockly.Events');
goog.require('Blockly.Events.Abstract');

goog.require('goog.array');
goog.require('goog.math.Coordinate');


/**
 * Abstract class for a frame event.
 * @param {Blockly.Frame} frame The frame this event corresponds
 *     to.
 * @extends {Blockly.Events.Abstract}
 * @constructor
 */
Blockly.Events.FrameBase = function(frame) {
  Blockly.Events.FrameBase.superClass_.constructor.call(this);
  this.frameId = frame.id;
  this.workspaceId = frame.workspace.id;
};
goog.inherits(Blockly.Events.FrameBase, Blockly.Events.Abstract);

/**
 * Encode the event as JSON.
 * @return {!Object} JSON representation.
 */
Blockly.Events.FrameBase.prototype.toJson = function() {
  var json = Blockly.Events.FrameBase.superClass_.toJson.call(this);
  json['id'] = this.frameId;
  return json;
};

/**
 * Decode the JSON event.
 * @param {!Object} json JSON representation.
 */
Blockly.Events.FrameBase.prototype.fromJson = function(json) {
  Blockly.Events.FrameBase.superClass_.toJson.call(this);
  this.frameId = json['id'];
};

/**
 * Class for a frame creation event.
 * @param {Blockly.Frame} frame The created frame.
 *     Null for a blank event.
 * @extends {Blockly.Events.FrameBase}
 * @constructor
 */
Blockly.Events.FrameCreate = function(frame) {
  if (!frame) {
    return;  // Blank event to be populated by fromJson.
  }
  Blockly.Events.FrameCreate.superClass_.constructor.call(this, frame);
  this.title = frame.title;
  this.color = frame.color;
  this.locked = frame.locked;
  this.collapsed = frame.isCollapsed;
  this.blocks = Object.keys(frame.blockDB_);
  this.x = frame.rect_.left;
  this.y = frame.rect_.top;
  this.width = frame.rect_.width;
  this.height = frame.rect_.height;
};
goog.inherits(Blockly.Events.FrameCreate, Blockly.Events.FrameBase);

/**
 * Type of this event.
 * @type {string}
 */
Blockly.Events.FrameCreate.prototype.type = Blockly.Events.FRAME_CREATE;

/**
 * Encode the event as JSON.
 * @return {!Object} JSON representation.
 */
Blockly.Events.FrameCreate.prototype.toJson = function() {
  var json = Blockly.Events.FrameCreate.superClass_.toJson.call(this);
  json['title'] = this.title;
  json['color'] = this.color;
  json['locked'] = this.locked;
  json['collapsed'] = this.collapsed;
  json['blocks'] = this.blocks;
  json['x'] = this.x;
  json['y'] = this.y;
  json['width'] = this.width;
  json['height'] = this.height;
  return json;
};

/**
 * Decode the JSON event.
 * @param {!Object} json JSON representation.
 */
Blockly.Events.FrameCreate.prototype.fromJson = function(json) {
  Blockly.Events.FrameCreate.superClass_.fromJson.call(this, json);
  this.title = json['title'];
  this.color = json['color'];
  this.locked = json['locked'];
  this.collapsed = json['collapsed'];
  this.blocks = json['blocks'];
  this.x = json['x'];
  this.y = json['y'];
  this.width = json['width'];
  this.height = json['height'];
};

/**
 * Run a frame creation event.
 * @param {boolean} forward True if run forward, false if run backward (undo).
 */
Blockly.Events.FrameCreate.prototype.run = function(forward) {
  var workspace = this.getEventWorkspace_();
  if (forward) {
    workspace.createFrame({
      id: this.frameId,
      title: this.title,
      color: this.color,
      locked: this.locked,
      collapsed: this.collapsed,
      blocks: this.blocks,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    });
  } else {
    workspace.deleteFrameById(this.frameId, true);
  }
};

/**
 * Class for a frame deletion event.
 * @param {Blockly.Frame} frame The deleted frame.
 *     Null for a blank event.
 * @extends {Blockly.Events.FrameBase}
 * @constructor
 */
Blockly.Events.FrameDelete = function(frame) {
  if (!frame) {
    return;  // Blank event to be populated by fromJson.
  }
  Blockly.Events.FrameDelete.superClass_.constructor.call(this, frame);
  this.title = frame.title;
  this.color = frame.color;
  this.locked = frame.locked;
  this.collapsed = frame.isCollapsed;
  this.blocks = Object.keys(frame.blockDB_);
  this.x = frame.rect_.left;
  this.y = frame.rect_.top;
  this.width = frame.rect_.width;
  this.height = frame.rect_.height;
};
goog.inherits(Blockly.Events.FrameDelete, Blockly.Events.FrameBase);

/**
 * Type of this event.
 * @type {string}
 */
Blockly.Events.FrameDelete.prototype.type = Blockly.Events.FRAME_DELETE;

/**
 * Encode the event as JSON.
 * @return {!Object} JSON representation.
 */
Blockly.Events.FrameDelete.prototype.toJson = function() {
  var json = Blockly.Events.FrameDelete.superClass_.toJson.call(this);
  json['title'] = this.title;
  json['color'] = this.color;
  json['locked'] = this.locked;
  json['collapsed'] = this.collapsed;
  json['blocks'] = this.blocks;
  json['x'] = this.x;
  json['y'] = this.y;
  json['width'] = this.width;
  json['height'] = this.height;
  return json;
};

/**
 * Decode the JSON event.
 * @param {!Object} json JSON representation.
 */
Blockly.Events.FrameDelete.prototype.fromJson = function(json) {
  Blockly.Events.FrameDelete.superClass_.fromJson.call(this, json);
  this.title = json['title'];
  this.color = json['color'];
  this.locked = json['locked'];
  this.collapsed = json['collapsed'];
  this.blocks = json['blocks'];
  this.x = json['x'];
  this.y = json['y'];
  this.width = json['width'];
  this.height = json['height'];
};

/**
 * Run a frame deletion event.
 * @param {boolean} forward True if run forward, false if run backward (undo).
 */
Blockly.Events.FrameDelete.prototype.run = function(forward) {
  var workspace = this.getEventWorkspace_();
  if (forward) {
    workspace.deleteFrameById(this.frameId);
  } else {
    workspace.createFrame({
      id: this.frameId,
      title: this.title,
      color: this.color,
      locked: this.locked,
      isCollapsed: this.collapsed,
      blocks: this.blocks,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    });
    workspace.resizeContents();
  }
};

/**
 * Class for a frame retitle event.
 * @param {Blockly.Frame} frame The retitled frame.
 *     Null for a blank event.
 * @param {string} newTitle The new title the frame will be changed to.
 * @extends {Blockly.Events.FrameBase}
 * @constructor
 */
Blockly.Events.FrameRetitle = function(frame, newTitle) {
  if (!frame) {
    return;  // Blank event to be populated by fromJson.
  }
  Blockly.Events.FrameRetitle.superClass_.constructor.call(this, frame);
  this.oldTitle = frame.title;
  this.newTitle = newTitle;
};
goog.inherits(Blockly.Events.FrameRetitle, Blockly.Events.FrameBase);

/**
 * Type of this event.
 * @type {string}
 */
Blockly.Events.FrameRetitle.prototype.type = Blockly.Events.FRAME_RETITLE;

/**
 * Encode the event as JSON.
 * @return {!Object} JSON representation.
 */
Blockly.Events.FrameRetitle.prototype.toJson = function() {
  var json = Blockly.Events.FrameRetitle.superClass_.toJson.call(this);
  json['oldTitle'] = this.oldTitle;
  json['newTitle'] = this.newTitle;
  return json;
};

/**
 * Decode the JSON event.
 * @param {!Object} json JSON representation.
 */
Blockly.Events.FrameRetitle.prototype.fromJson = function(json) {
  Blockly.Events.FrameRetitle.superClass_.fromJson.call(this, json);
  this.oldTitle = json['oldTitle'];
  this.newTitle = json['newTitle'];
};

/**
 * Run a frame retitle event.
 * @param {boolean} forward True if run forward, false if run backward (undo).
 */
Blockly.Events.FrameRetitle.prototype.run = function(forward) {
  var workspace = this.getEventWorkspace_();
  if (forward) {
    workspace.retitleFrameById(this.frameId, this.newTitle);
  } else {
    workspace.retitleFrameById(this.frameId, this.oldTitle);
  }
};

/**
 * Class for a frame drag event. Fired when frame dragged into or out of
 * the frame UI.
 * @param {Blockly.Frame} frame The moved frame.  Null for a blank event.
 * @extends {Blockly.Events.FrameBase}
 * @constructor
 */
Blockly.Events.DragFrameOutside = function(frame) {
  if (!frame) {
    return;  // Blank event to be populated by fromJson.
  }
  Blockly.Events.DragFrameOutside.superClass_.constructor.call(this, frame);
  this.recordUndo = false;
};
goog.inherits(Blockly.Events.DragFrameOutside, Blockly.Events.FrameBase);

/**
 * Type of this event.
 * @type {string}
 */
Blockly.Events.DragFrameOutside.prototype.type = Blockly.Events.FRAME_DRAG_OUTSIDE;

/**
 * Encode the event as JSON.
 * @return {!Object} JSON representation.
 */
Blockly.Events.DragFrameOutside.prototype.toJson = function() {
  var json = Blockly.Events.DragFrameOutside.superClass_.toJson.call(this);
  if (this.isOutside) {
    json['isOutside'] = this.isOutside;
  }
  return json;
};

/**
 * Decode the JSON event.
 * @param {!Object} json JSON representation.
 */
Blockly.Events.DragFrameOutside.prototype.fromJson = function(json) {
  Blockly.Events.DragBlockOutside.superClass_.fromJson.call(this, json);
  this.isOutside = json['isOutside'];
};

/**
 * Class for a frame end drag event.
 * @param {Blockly.Frame} frame The moved frame.  Null for a blank event.
 * @param {boolean} isOutside True if the moved frame is outside of the
 *     blocks workspace.
 * @extends {Blockly.Events.FrameBase}
 * @constructor
 */
Blockly.Events.EndFrameDrag = function(frame, isOutside) {
  if (!frame) {
    return;  // Blank event to be populated by fromJson.
  }
  Blockly.Events.EndFrameDrag.superClass_.constructor.call(this, frame);
  this.isOutside = isOutside;
  // If drag ends outside the blocks workspace, send the block XML
  if (isOutside) {
    this.xml = Blockly.Xml.frameToDom(frame, true);
  }
  this.recordUndo = false;
  this.batchElements = [[],[]];
  if (frame.temporaryBatchElements) {
    frame.temporaryBatchElements[1].forEach(item => {
      if (item.id !== frame.id) {
        this.batchElements[1].push(Blockly.Xml.frameToDom(item, true));
      }
    });
    frame.temporaryBatchElements[0].forEach(item => {
      this.batchElements[0].push(Blockly.Xml.blockToDom(item, true));
    });
  }
};
goog.inherits(Blockly.Events.EndFrameDrag, Blockly.Events.FrameBase);

/**
 * Type of this event.
 * @type {string}
 */
Blockly.Events.EndFrameDrag.prototype.type = Blockly.Events.FRAME_END_DRAG;

/**
 * Encode the event as JSON.
 * @return {!Object} JSON representation.
 */
Blockly.Events.EndFrameDrag.prototype.toJson = function() {
  var json = Blockly.Events.EndFrameDrag.superClass_.toJson.call(this);
  if (this.isOutside) {
    json['isOutside'] = this.isOutside;
  }
  if (this.xml) {
    json['xml'] = this.xml;
  }
  return json;
};

/**
 * Decode the JSON event.
 * @param {!Object} json JSON representation.
 */
Blockly.Events.EndFrameDrag.prototype.fromJson = function(json) {
  Blockly.Events.EndFrameDrag.superClass_.fromJson.call(this, json);
  this.isOutside = json['isOutside'];
  this.xml = json['xml'];
};

/**
 * Class for a frame change event.
 * @param {Blockly.Frame} frame
 *     The frame that is being changed. Null for a blank event.
 * @param {string} element One of 'rect', 'blocks', 'color', etc.
 * @param {*} oldValue Previous value of element.
 * @param {*} newValue New value of element.
 * @extends {Blockly.Events.FrameBase}
 * @constructor
 */
Blockly.Events.FrameChange = function(frame, element, oldValue, newValue) {
  if (!frame) {
    return;  // Blank event to be populated by fromJson.
  }
  Blockly.Events.FrameChange.superClass_.constructor.call(this, frame);
  this.element = element;
  this.oldValue = oldValue;
  this.newValue = newValue;
};
goog.inherits(Blockly.Events.FrameChange, Blockly.Events.FrameBase);

/**
 * Type of this event.
 * @type {string}
 */
Blockly.Events.FrameChange.prototype.type = Blockly.Events.FRAME_CHANGE;

/**
 * Encode the event as JSON.
 * @return {!Object} JSON representation.
 */
Blockly.Events.FrameChange.prototype.toJson = function() {
  var json = Blockly.Events.FrameChange.superClass_.toJson.call(this);
  json['element'] = this.element;
  json['newValue'] = this.newValue;
  return json;
};

/**
 * Decode the JSON event.
 * @param {!Object} json JSON representation.
 */
Blockly.Events.FrameChange.prototype.fromJson = function(json) {
  Blockly.Events.FrameChange.superClass_.fromJson.call(this, json);
  this.element = json['element'];
  this.newValue = json['newValue'];
};

/**
 * Does this event record any change of state?
 * @return {boolean} False if something changed.
 */
Blockly.Events.FrameChange.prototype.isNull = function() {
  return JSON.stringify(this.oldValue) == JSON.stringify(this.newValue);
};

/**
 * Run a change event.
 * @param {boolean} forward True if run forward, false if run backward (undo).
 */
Blockly.Events.FrameChange.prototype.run = function(forward) {
  var workspace = this.getEventWorkspace_();
  var frame = workspace.getFrameById(this.frameId);
  if (!frame) {
    console.warn('Can\'t change non-existent frame: ' + this.frameId);
    return;
  }
  var value = forward ? this.newValue : this.oldValue;
  switch (this.element) {
    case 'blocks':
      var l1 = forward ? this.newValue.blocks : this.oldValue.blocks;
      var l2 = forward ? this.oldValue.blocks : this.newValue.blocks;
      var addedBlocks = l1.filter(function(v){ return l2.indexOf(v) == -1;});
      addedBlocks.forEach(blockId => {
        const block = workspace.getBlockById(blockId);
        if (block) {
          const result = block.requestMoveInFrame();
          // If it fail to add the block to frame, it means that there is a special scenario present,
          // such as the Block needing to change from a connected state to a disconnected state. In this case,
          // the Block cannot be added because it is a non-top level block. It needs to be waited for
          // the Block to move to the top level block and then tried again.
          if(!result) {
            // Here, a hack is used to make the Block try to add frames later on,
            // the first frame it tries to add is this frame.
            var temp = workspace.frameDB_[this.frameId];
            delete workspace.frameDB_[this.frameId];
            workspace.frameDB_[this.frameId] = temp;
          }
        }
      });
      var deletedBlocks = l2.filter(function(v){ return l1.indexOf(v) == -1;});
      deletedBlocks.forEach(blockId => {
        const block = workspace.getBlockById(blockId);
        if (block) {
          block.requestMoveOutFrame();
        }
      });
      break;
    case 'rect':
      frame.render(value, false);
      break;
    case 'color':
      frame.setColor(value.color);
      break;
    case 'collapsed':
      frame.triggerChangeCollapsed(value.collapsed);
      break;
    case 'locked':
      frame.triggerChangeLock();
      break;
    default:
      console.warn('Unknown change type: ' + this.element);
  }
};
