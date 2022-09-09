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

/**
 * @fileoverview Class for a category header in the flyout for Scratch
 * extensions which can display a textual label and a status button.
 * @author ericr@media.mit.edu (Eric Rosenbaum)
 */
'use strict';

goog.provide('Blockly.FlyoutExtensionCategoryHeader');

goog.require('Blockly.FlyoutButton');

/**
 * Class for a category header in the flyout for Scratch extensions which can
 * display a textual label and a status button.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace in which to place this
 *     header.
 * @param {!Blockly.WorkspaceSvg} targetWorkspace The flyout's target workspace.
 * @param {!Element} xml The XML specifying the header.
 * @extends {Blockly.FlyoutButton}
 * @constructor
 */
Blockly.FlyoutExtensionCategoryHeader = function(workspace, targetWorkspace, xml) {

  this.init(workspace, targetWorkspace, xml, false);

  /**
   * @type {number}
   * @private
   */
  this.flyoutWidth_ = this.targetWorkspace_.getFlyout().getWidth();

  /**
   * @type {string}
   */
  this.extensionId = xml.getAttribute('id');

  /**
   * @type {string}
   * @private
   */
  this.warningTipText_ = String(xml.getAttribute('warningTipText'));
 
  /**
  * @type {boolean}
  * @private
   */
  this.showStatusButton_ = xml.getAttribute('showStatusButton') == 'true';
 
  /**
   * Whether this is a label at the top of a category.
   * @type {boolean}
   * @private
   */
  this.isCategoryLabel_ = true;
 
  this.menuButtonsCount = 0;
  this.menuButtonWidth = 24;
  this.marginX = 15;
  this.marginY = 11;
  this.touchPadding = 6;
};
goog.inherits(Blockly.FlyoutExtensionCategoryHeader, Blockly.FlyoutButton);
 
/**
 * Create the label and button elements.
 * @return {!Element} The SVG group.
  */
Blockly.FlyoutExtensionCategoryHeader.prototype.createDom = function() {
  var cssClass = 'blocklyFlyoutLabel';
  this.menuButtonsCount = 0;
  this.svgGroup_ = Blockly.utils.createSvgElement('g', {'class': cssClass}, this.workspace_.getCanvas());
 
  this.addTextSvg(true);
 
  this.refreshStatus();
 
  if (this.warningTipText_ !== 'null') {
    var warningTipElements = this.appendMenuNode('scratch-warning.svg');
    this.tipElement_ = warningTipElements.element;
    this.tipElementBackground_ = warningTipElements.elementBackground;
    Blockly.bindEventWithChecks_(this.tipElementBackground_, 'mouseover', this, this.onMouseOver_, true);
    Blockly.bindEventWithChecks_(this.tipElementBackground_, 'mouseout', this, this.onMouseOut_, true);
  }
 
  if(this.showStatusButton_ && this.imageSrc_) {
    var statusButtonElements = this.appendMenuNode(null, true);
    this.imageElement_ = statusButtonElements.element;
    this.imageElementBackground_ = statusButtonElements.elementBackground;
    this.setImageSrc(this.imageSrc_);
    this.callback_ = Blockly.statusButtonCallback.bind(this, this.extensionId);
    Blockly.bindEventWithChecks_(this.imageElementBackground_, 'mouseup', this, this.onMouseUp_);
  }
 
  return this.svgGroup_;
};
 
/**
 * Add a menu to the Label node.
 * @param {string} iconFileName Name of the icon.
 * @param {string} clickable True if element is clickable.
 * @return {object} The menu element node and elementBackground node.
  */
Blockly.FlyoutExtensionCategoryHeader.prototype.appendMenuNode = function(iconFileName, clickable) {
  var basePath = Blockly.mainWorkspace.options.pathToMedia;
  this.menuButtonsCount ++;
  /** @type {SVGElement} */
  var elementBackground = Blockly.utils.createSvgElement(
      'rect',
      {
        'class': 'extensionHeaderMenuBackground' + (clickable ? ' clickable' : ''),
        'height': this.menuButtonWidth + 2 * this.touchPadding + 'px',
        'width': this.menuButtonWidth + 2 * this.touchPadding + 'px',
        'x': (this.getMenuButtonPositionX() - this.touchPadding) + 'px',
        'y': (this.marginY - this.touchPadding) + 'px'
      },
      this.svgGroup_);
  /** @type {SVGElement} */
  var element = Blockly.utils.createSvgElement(
      'image',
      {
        'class': 'extensionHeaderMenu',
        'height': this.menuButtonWidth + 'px',
        'width': this.menuButtonWidth + 'px',
        'x': this.getMenuButtonPositionX() + 'px',
        'y': this.marginY + 'px',
      },
      this.svgGroup_);
  if (iconFileName !== null) {
    element.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', basePath + iconFileName);
  }
  return {element: element, elementBackground: elementBackground };
};
 
/**
 * Gets the X position of the menu button.
 * @return {number} The distance to the left of the menu node
  */
Blockly.FlyoutExtensionCategoryHeader.prototype.getMenuButtonPositionX = function() {
  if(this.workspace_.RTL) {
    return (this.marginX - this.flyoutWidth_ + (this.menuButtonWidth * this.menuButtonsCount)) / this.workspace_.scale;
  }
  return (this.flyoutWidth_ - (this.menuButtonWidth * this.menuButtonsCount) - this.marginX) / this.workspace_.scale;
};
 
/**
 * Set the image on the status button using a status string.
  */
Blockly.FlyoutExtensionCategoryHeader.prototype.refreshStatus = function() {
  var status = Blockly.FlyoutExtensionCategoryHeader.getExtensionState(this.extensionId);
  var basePath = Blockly.mainWorkspace.options.pathToMedia;
  if (status == Blockly.StatusButtonState.READY) {
    this.setImageSrc(basePath + 'status-ready.svg');
  }
  if (status == Blockly.StatusButtonState.NOT_READY) {
    this.setImageSrc(basePath + 'status-not-ready.svg');
  }
};
 
/**
 * Set the source URL of the image for the button.
 * @param {?string} src New source.
 * @package
  */
Blockly.FlyoutExtensionCategoryHeader.prototype.setImageSrc = function(src) {
  if (src === null) {
    // No change if null.
    return;
  }
  this.imageSrc_ = src;
  if (this.imageElement_) {
    this.imageElement_.setAttributeNS('http://www.w3.org/1999/xlink',
        'xlink:href', this.imageSrc_ || '');
  }
};
 
/**
 * Gets the extension state. Overridden externally.
 * @param {string} extensionId The ID of the extension in question.
 * @return {Blockly.StatusButtonState} The state of the extension.
 * @public
  */
Blockly.FlyoutExtensionCategoryHeader.getExtensionState = function(/* extensionId */) {
  return Blockly.StatusButtonState.NOT_READY;
};
 
/**
 * @param {!Event} e Mouse up event.
 * @private
  */
Blockly.FlyoutExtensionCategoryHeader.prototype.onMouseOver_ = function(e) {
  var rect = e.target.getBoundingClientRect();
  var container = document.createElement('div');
  container.className = "extensionTipContainer";
  container.innerText = this.warningTipText_;
  container.style.left = rect.x + 'px';
  container.style.top = rect.y + 30 + 'px';
  document.body.appendChild(container);
  this.tipContainer = container;
};
 
/**
 * @param {!Event} e Mouse up event.
 * @private
  */
Blockly.FlyoutExtensionCategoryHeader.prototype.onMouseOut_ = function() {
  document.body.removeChild(this.tipContainer);
};
 
 
