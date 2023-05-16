/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2011 Google Inc.
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

/**
 * @name Blockly.ColorSelector
 * @namespace
 */
goog.provide('Blockly.ColorSelector');

goog.require('goog.dom');


/**
 * RGB value list of colors available for selection.
 * @type {Array.<!string>}
 */
Blockly.ColorSelector.colors = [
  "57, 198, 108",
  "45, 140, 255",
  "255, 199, 0",
  "250, 89, 76",
  "111, 86, 249",
  "64, 242, 199",
  "49, 181, 255",
  "238, 70, 211",
  "234, 105, 47",
];

Blockly.ColorSelector.show = function(e, color, onChange) {
  this.targetNode = e.target;

  this.setColor(color || this.selectedColor_);
  this.onChange = onChange;

  this.position_(e);
  this.selectorRoot_.classList.remove('blocklyColorSelectorHidden');
  this.closeListener = Blockly.bindEvent_(document, 'mouseup', this, this.handleClose);
};

Blockly.ColorSelector.hide = function() {
  this.selectorRoot_.classList.add('blocklyColorSelectorHidden');
  Blockly.unbindEvent_(this.closeListener);
  this.onChange = null;
};

Blockly.ColorSelector.createDom = function() {
  this.selectorRoot_ = goog.dom.createDom('div', "blocklyColorSelector blocklyColorSelectorHidden");

  const title = document.createElement("h3");
  title.innerText = "色彩预设";
  const colorListContainer = goog.dom.createDom("div", "blocklyColorOptions");
  this.colors.forEach((color) => {
    const colorOption = goog.dom.createDom("div", "blocklyColorOption" );
    colorOption.setAttribute('color', color);
    colorOption.style.setProperty("--color", `rgb(${color})`);
    colorListContainer.appendChild(colorOption);
    Blockly.bindEvent_(colorOption, 'mouseup', this, this.onSelect);
  });
  this.selectorRoot_.appendChild(title);
  this.selectorRoot_.appendChild(colorListContainer);

  this.setColor(this.colors[0]);

  document.body.appendChild(this.selectorRoot_);
};

Blockly.ColorSelector.handleClose = function(e) {
  if (this.targetNode !== e.target && this.selectorRoot_ && !this.selectorRoot_.contains(e.target)) {
    this.hide();
  }
};

Blockly.ColorSelector.onSelect = function(e) {
  const color = e.target.getAttribute('color');
  this.setColor(color);
  if (this.onChange) {
    this.onChange(color);
  }
  this.hide();
};

Blockly.ColorSelector.position_ = function(e) {
  const { width, height } = this.selectorRoot_.getBoundingClientRect();
  const { left, bottom, top } = e.target.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  let padding = 6;
  let pl = left;
  let pt = top - height - padding;

  if (top - padding  < height) {
    pt = bottom + padding;
  }

  if (windowWidth - left - padding < width) {
    pl = left - width - padding;
  }
  this.selectorRoot_.style.left = pl + 'px';
  this.selectorRoot_.style.top = pt + 'px';
};

Blockly.ColorSelector.setColor = function(color) {
  this.selectorRoot_.querySelectorAll('.blocklyColorOption').forEach((ele) => {
    if (ele.getAttribute('color') === color) {
      this.selectedColor_ = color;
      ele.className = 'blocklyColorOption blocklyColorOptionSelected';
    } else if (ele.className.includes('blocklyColorOptionSelected')) {
      ele.className = 'blocklyColorOption';
    }
  });
};

Blockly.ColorSelector.selectedColor_ = "";
