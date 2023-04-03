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
    workspace.createFrame(this.frameId, this.title, this.blocks,  this.x, this.y, this.width, this.height);
  } else {
    workspace.deleteFrameById(this.frameId);
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
    workspace.createFrame(this.frameId, this.title, this.blocks,  this.x, this.y, this.width, this.height);
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
 * Class for a frame change event.
 * @param {Blockly.Frame} frame
 *     The frame that is being changed. Null for a blank event.
 * @param {!object} oldProperties Object containing previous state of a frame's
 *     properties. The possible properties can be: 'blocks', 'x', 'y', or
 *     'width' and 'height' together. Must contain the same property (or in the
 *     case of 'width' and 'height' properties) as the 'newProperties' param.
 * @param {!object} newProperties Object containing the new state of a frame's
 *     properties. The possible properties can be: 'blocks', 'x', 'y', or
 *     'width' and 'height' together. Must contain the same property (or in the
 *     case of 'width' and 'height' properties) as the 'oldProperties' param.
 * @extends {Blockly.Events.FrameBase}
 * @constructor
 */
Blockly.Events.FrameChange = function(frame, oldProperties, newProperties) {
  if (!frame) {
    return;  // Blank event to be populated by fromJson.
  }
  Blockly.Events.FrameChange.superClass_.constructor.call(this, frame);
  this.oldProperties = oldProperties;
  this.newProperties = newProperties;
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
  json['newProperties'] = this.newProperties;
  return json;
};

/**
 * Decode the JSON event.
 * @param {!Object} json JSON representation.
 */
Blockly.Events.FrameChange.prototype.fromJson = function(json) {
  Blockly.Events.FrameChange.superClass_.fromJson.call(this, json);
  this.newProperties = json['newValue'];
};

/**
 * Does this event record any change of state?
 * @return {boolean} False if something changed.
 */
Blockly.Events.FrameChange.prototype.isNull = function() {
  return this.oldProperties == this.newProperties;
};

/**
 * Run a change event.
 * @param {boolean} forward True if run forward, false if run backward (undo).
 */
Blockly.Events.FrameChange.prototype.run = function(forward) {
  // var frame = this.getFrame_();
  // if (!frame) {
  //   console.warn('Can\'t change non-existent frame: ' + this.frameId);
  //   return;
  // }
  // var contents = forward ? this.newProperties : this.oldProperties;
  // if (contents.hasOwnProperty('minimized')) {
  //   frame.setMinimized(contents.minimized);
  // }
  // if (contents.hasOwnProperty('width') && contents.hasOwnProperty('height')) {
  //   frame.setSize(contents.width, contents.height);
  // }
  // if (contents.hasOwnProperty('text')) {
  //   frame.setText(contents.text);
  // }
};
