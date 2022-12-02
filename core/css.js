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

/**
 * @fileoverview Inject Blockly's CSS synchronously.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * @name Blockly.Css
 * @namespace
 */
goog.provide('Blockly.Css');

goog.require('Blockly.Colours');

goog.require('goog.userAgent');

/**
 * List of cursors.
 * @enum {string}
 */
Blockly.Css.Cursor = {
  OPEN: 'handopen',
  CLOSED: 'handclosed',
  DELETE: 'handdelete'
};

/**
 * Current cursor (cached value).
 * @type {string}
 * @private
 */
Blockly.Css.currentCursor_ = '';

/**
 * Large stylesheet added by Blockly.Css.inject.
 * @type {Element}
 * @private
 */
Blockly.Css.styleSheet_ = null;

/**
 * Path to media directory, with any trailing slash removed.
 * @type {string}
 * @private
 */
Blockly.Css.mediaPath_ = '';

/**
 * Inject the CSS into the DOM.  This is preferable over using a regular CSS
 * file since:
 * a) It loads synchronously and doesn't force a redraw later.
 * b) It speeds up loading by not blocking on a separate HTTP transfer.
 * c) The CSS content may be made dynamic depending on init options.
 * @param {boolean} hasCss If false, don't inject CSS
 *     (providing CSS becomes the document's responsibility).
 * @param {string} pathToMedia Path from page to the Blockly media directory.
 */
Blockly.Css.inject = function(hasCss, pathToMedia) {
  // Only inject the CSS once.
  if (Blockly.Css.styleSheet_) {
    return;
  }
  // Placeholder for cursor rule.  Must be first rule (index 0).
  var text = '.blocklyDraggable {}\n';
  if (hasCss) {
    text += Blockly.Css.CONTENT.join('\n');
    if (Blockly.FieldDate) {
      text += Blockly.FieldDate.CSS.join('\n');
    }
  }
  // Strip off any trailing slash (either Unix or Windows).
  Blockly.Css.mediaPath_ = pathToMedia.replace(/[\\\/]$/, '');
  text = text.replace(/<<<PATH>>>/g, Blockly.Css.mediaPath_);
  // Dynamically replace colours in the CSS text, in case they have
  // been set at run-time injection.
  for (var colourProperty in Blockly.Colours) {
    if (Blockly.Colours.hasOwnProperty(colourProperty)) {
      // Replace all
      text = text.replace(
        new RegExp('\\$colour\\_' + colourProperty, 'g'),
        Blockly.Colours[colourProperty]
      );
    }
  }

  // Inject CSS tag at start of head.
  var cssNode = document.createElement('style');
  document.head.insertBefore(cssNode, document.head.firstChild);

  var cssTextNode = document.createTextNode(text);
  cssNode.appendChild(cssTextNode);
  Blockly.Css.styleSheet_ = cssNode.sheet;
};

/**
 * Set the cursor to be displayed when over something draggable.
 * See See https://github.com/google/blockly/issues/981 for context.
 * @param {Blockly.Css.Cursor} cursor Enum.
 * @deprecated April 2017.
 */
Blockly.Css.setCursor = function(cursor) {
  console.warn('Deprecated call to Blockly.Css.setCursor.' +
    'See https://github.com/google/blockly/issues/981 for context');
};

/**
 * Array making up the CSS content for Blockly.
 */
Blockly.Css.CONTENT = [
  '.blocklySvg {',
    'background-color: $colour_workspace;',
    'outline: none;',
    'overflow: hidden;',  /* IE overflows by default. */
    'position: absolute;',
    'display: block;',
  '}',

  /* Necessary to position the drag surface */
  '.blocklyRelativeWrapper {',
    'position: relative;',
    'width: 100%;',
    'height: 100%;',
  '}',

  '.blocklyWidgetDiv {',
    'display: none;',
    'position: absolute;',
    'z-index: 99999;', /* big value for bootstrap3 compatibility */
  '}',

  '.injectionDiv {',
    'height: 100%;',
    'position: relative;',
    'overflow: hidden;', /* So blocks in drag surface disappear at edges */
    'touch-action: none',
  '}',

  '.blocklyNonSelectable {',
    'user-select: none;',
    '-moz-user-select: none;',
    '-webkit-user-select: none;',
    '-ms-user-select: none;',
  '}',

  '.blocklyWidgetDiv.fieldTextInput {',
    'overflow: hidden;',
    'border: 1px solid;',
    'box-sizing: border-box;',
    'transform-origin: 0 0;',
    '-ms-transform-origin: 0 0;',
    '-moz-transform-origin: 0 0;',
    '-webkit-transform-origin: 0 0;',
  '}',

  '.blocklyWidgetDiv.fieldTextInput.removableTextInput {',
    'overflow: visible;',
    'outline: none;',
  '}',

  '.blocklyTextDropDownArrow {',
    'position: absolute;',
  '}',

  '.blocklyTextRemoveIcon {',
    'position: absolute;',
    'width: 24px;',
    'height: 24px;',
    'top: -40px;',
    'left: 50%;',
    'margin-left: -12px;',
    'cursor: pointer;',
  '}',

  '.blocklyNonSelectable {',
    'user-select: none;',
    '-moz-user-select: none;',
    '-webkit-user-select: none;',
    '-ms-user-select: none;',
  '}',

  '.blocklyWsDragSurface {',
    'display: none;',
    'position: absolute;',
    'top: 0;',
    'left: 0;',
  '}',
  /* Added as a separate rule with multiple classes to make it more specific
     than a bootstrap rule that selects svg:root. See issue #1275 for context.
  */
  '.blocklyWsDragSurface.blocklyOverflowVisible {',
    'overflow: visible;',
  '}',

  '.blocklyBlockDragSurface {',
    'display: none;',
    'position: absolute;',
    'top: 0;',
    'left: 0;',
    'right: 0;',
    'bottom: 0;',
    'overflow: visible !important;',
    'z-index: 50;', /* Display above the toolbox */
  '}',

  '.blocklyTooltipDiv {',
    'background-color: #ffffc7;',
    'border: 1px solid #ddc;',
    'box-shadow: 4px 4px 20px 1px rgba(0,0,0,.15);',
    'color: #000;',
    'display: none;',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 9pt;',
    'opacity: 0.9;',
    'padding: 2px;',
    'position: absolute;',
    'z-index: 100000;', /* big value for bootstrap3 compatibility */
  '}',

  '.blocklyDropDownDiv {',
    'position: fixed;',
    'left: 0;',
    'top: 0;',
    'z-index: 1000;',
    'display: none;',
    'border: 1px solid;',
    'border-radius: 4px;',
    'box-shadow: 0px 0px 8px 1px ' + Blockly.Colours.dropDownShadow + ';',
    'padding: 4px;',
    '-webkit-user-select: none;',
    'min-height: 15px',
  '}',

  '.blocklyDropDownContent {',
    'max-height: 300px;', // @todo: spec for maximum height.
    'overflow: auto;',
  '}',

  '.blocklyDropDownArrow {',
    'position: absolute;',
    'left: 0;',
    'top: 0;',
    'width: 16px;',
    'height: 16px;',
    'z-index: -1;',
    'background-color: inherit;',
    'border-color: inherit;',
  '}',

  '.blocklyDropDownButton {',
    'display: inline-block;',
    'float: left;',
    'padding: 0;',
    'margin: 4px;',
    'border-radius: 4px;',
    'outline: none;',
    'border: 1px solid;',
    'transition: box-shadow .1s;',
    'cursor: pointer;',
  '}',

  '.blocklyDropDownButtonHover {',
    'box-shadow: 0px 0px 0px 4px ' + Blockly.Colours.fieldShadow + ';',
  '}',

  '.blocklyDropDownButton:active {',
    'box-shadow: 0px 0px 0px 6px ' + Blockly.Colours.fieldShadow + ';',
  '}',

  '.blocklyDropDownButton > img {',
    'width: 80%;',
    'height: 80%;',
    'margin-top: 5%',
  '}',

  '.blocklyDropDownPlaceholder {',
    'display: inline-block;',
    'float: left;',
    'padding: 0;',
    'margin: 4px;',
  '}',

  '.blocklyNumPadButton {',
    'display: inline-block;',
    'float: left;',
    'padding: 0;',
    'width: 48px;',
    'height: 48px;',
    'margin: 4px;',
    'border-radius: 4px;',
    'background: $colour_numPadBackground;',
    'color: $colour_numPadText;',
    'outline: none;',
    'border: 1px solid $colour_numPadBorder;',
    'cursor: pointer;',
    'font-weight: 600;',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 12pt;',
    '-webkit-tap-highlight-color: rgba(0,0,0,0);',
  '}',

  '.blocklyNumPadButton > img {',
    'margin-top: 10%;',
    'width: 80%;',
    'height: 80%;',
  '}',

  '.blocklyNumPadButton:active {',
    'background: $colour_numPadActiveBackground;',
    '-webkit-tap-highlight-color: rgba(0,0,0,0);',
  '}',

  '.arrowTop {',
    'border-top: 1px solid;',
    'border-left: 1px solid;',
    'border-top-left-radius: 4px;',
    'border-color: inherit;',
  '}',

  '.arrowBottom {',
    'border-bottom: 1px solid;',
    'border-right: 1px solid;',
    'border-bottom-right-radius: 4px;',
    'border-color: inherit;',
  '}',

  '.valueReportBox {',
    'min-width: 50px;',
    'max-width: 300px;',
    'max-height: 200px;',
    'overflow: auto;',
    'word-wrap: break-word;',
    'text-align: center;',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: .8em;',
  '}',

  '.blocklyResizeSE {',
    'cursor: se-resize;',
    'fill: #aaa;',
  '}',

  '.blocklyResizeSW {',
    'cursor: sw-resize;',
    'fill: #aaa;',
  '}',

  '.blocklyResizeLine {',
    'stroke: #888;',
    'stroke-width: 1;',
  '}',

  '.blocklyHighlightedConnectionPath {',
    'fill: none;',
    'stroke: #fc3;',
    'stroke-width: 4px;',
  '}',

  '.blocklyPath {',
    'stroke-width: 1px;',
  '}',

  '.blocklySelected>.blocklyPath {',
    // 'stroke: #fc3;',
    // 'stroke-width: 3px;',
  '}',

  '.blocklySelected>.blocklyPathLight {',
    'display: none;',
  '}',

  '.blocklyDraggable {',
    /* backup for browsers (e.g. IE11) that don't support grab */
    'cursor: url("<<<PATH>>>/handopen.cur"), auto;',
    'cursor: grab;',
    'cursor: -webkit-grab;',
    'cursor: -moz-grab;',
  '}',

   '.blocklyDragging {',
    /* backup for browsers (e.g. IE11) that don't support grabbing */
    'cursor: url("<<<PATH>>>/handclosed.cur"), auto;',
    'cursor: grabbing;',
    'cursor: -webkit-grabbing;',
    'cursor: -moz-grabbing;',
  '}',
  /* Changes cursor on mouse down. Not effective in Firefox because of
    https://bugzilla.mozilla.org/show_bug.cgi?id=771241 */
  '.blocklyDraggable:active {',
    /* backup for browsers (e.g. IE11) that don't support grabbing */
    'cursor: url("<<<PATH>>>/handclosed.cur"), auto;',
    'cursor: grabbing;',
    'cursor: -webkit-grabbing;',
    'cursor: -moz-grabbing;',
  '}',
  /* Change the cursor on the whole drag surface in case the mouse gets
     ahead of block during a drag. This way the cursor is still a closed hand.
   */
  '.blocklyBlockDragSurface .blocklyDraggable {',
    /* backup for browsers (e.g. IE11) that don't support grabbing */
    'cursor: url("<<<PATH>>>/handclosed.cur"), auto;',
    'cursor: grabbing;',
    'cursor: -webkit-grabbing;',
    'cursor: -moz-grabbing;',
  '}',

  '.blocklyDragging.blocklyDraggingDelete {',
    'cursor: url("<<<PATH>>>/handdelete.cur"), auto;',
  '}',

  '.blocklyDragging.blocklyDraggingMouseThrough {',
    'pointer-events: none;',
  '}',

  '.blocklyToolboxDelete {',
    'position: relative;',
    'cursor: url("<<<PATH>>>/handdelete.cur"), auto;',
  '}',
  '.blocklyToolboxDelete.nonStickyFlyout::after {',
    'position: absolute;',
    'content: "";',
    'background-image: url("<<<PATH>>>/trash-can.png");',
    'background-repeat: no-repeat;',
    'background-position: center center;',
    'background-size: contain;',
    'top: 0;',
    'left: 0;',
    'width: 100%;',
    'height: 100%;',
    'background-color: rgba(0, 0, 0, 0.2);',
  '}',

  '.blocklyToolboxGrab {',
    'cursor: url("<<<PATH>>>/handclosed.cur"), auto;',
    'cursor: grabbing;',
    'cursor: -webkit-grabbing;',
  '}',

  '.blocklyDragging>.blocklyPath,',
  '.blocklyDragging>.blocklyPathLight {',
    'fill-opacity: 1.0;',
    'stroke-opacity: 1.0;',
  '}',

  '.blocklyDragging>.blocklyPath {',
  '}',

  '.blocklyDisabled>.blocklyPath {',
    'fill-opacity: .5;',
    'stroke-opacity: .5;',
  '}',

  '.blocklyInsertionMarker>.blocklyPath {',
    'stroke: none;',
  '}',

  '.blocklyText {',
    'fill: #fff;',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 12pt;',
    'font-weight: 500;',
  '}',

  '.blocklyTextTruncated {',
    'font-size: 11pt;',
  '}',

  '.blocklyNonEditableText>text {',
    'pointer-events: none;',
  '}',
  '.blocklyNonEditableText>text,',
  '.blocklyEditableText>text {',
    'fill: $colour_text;',
  '}',

  '.blocklyEditableText>.blocklyEditableLabel {',
    'fill: #fff;',
  '}',

  '.blocklyDropdownText {',
    'fill: #fff !important;',
  '}',

  '.blocklyBubbleText {',
    'fill: $colour_text;',
  '}',
  '.blocklyFlyout {',
    'position: absolute;',
    'z-index: 20;',
    'transition: .3s;',
  '}',
  '.blocklyFlyout.blocklyFlyoutHidingAnimation {',
    'opacity: 0;',
    'transform: translateX(-100%) !important;',
  '}',
  '.blocklyFlyoutButton {',
    'fill: none;',
    'pointer-events: all;',
  '}',

  '.blocklyFlyoutButtonBackground {',
      'stroke: #c6c6c6;',
  '}',

  '.blocklyFlyoutButton .blocklyText {',
    'fill: var(--theme-text-primary);',
  '}',

  '.blocklyFlyoutButtonShadow {',
    'fill: transparent;',
  '}',

  '.blocklyFlyoutButton:hover {',
    'cursor: pointer;',
  '}',

  '.blocklyFlyoutLabel {',
    'cursor: default;',
  '}',

  '.blocklyFlyoutLabelBackground {',
    'opacity: 0;',
  '}',

  '.blocklyTouchTargetBackground {',
    'fill: transparent;',
    'cursor: pointer;',
  '}',

  '.extensionHeaderMenu {',
    'pointer-events: none;',
  '}',

  '.extensionHeaderMenuBackground {',
    'fill: transparent;',
  '}',

  '.extensionHeaderMenuBackground:hover {',
    'fill: #3E495B;',
    'rx: 5px;',
    'ry: 5px;',
  '}',

  '.clickable {',
    'fill: transparent;',
    'cursor: pointer;',
  '}',

  '.extensionTipContainer {',
    'position: fixed;',
    'max-width: 284px;',
    'min-width: 100px;',
    'padding: 16px;',
    'font-size: 12px;',
    'line-height: 18px;',
   ' color: #D1D5DB;',
    'background: #191E25;',
    'border-radius: 8px;',
    'border: 1px solid rgba(46, 54, 68, 0.6);',
    'box-shadow: 0px 10px 24px rgba(0, 0, 0, 0.15), 0px 2px 16px rgba(0, 0, 0, 0.5);',
    'z-index: 990;',
  '}',

  '.blocklyFlyoutLabelText {',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 14pt;',
    'fill: var(--theme-text-primary);',
    'font-weight: bold;',
  '}',

  /*
    Don't allow users to select text.  It gets annoying when trying to
    drag a block and selected text moves instead.
  */
  '.blocklySvg text, .blocklyBlockDragSurface text, .blocklyFlyout text, .blocklyToolboxDiv text {',
    'user-select: none;',
    '-moz-user-select: none;',
    '-webkit-user-select: none;',
    'cursor: inherit;',
  '}',

  '.blocklyHidden {',
    'display: none;',
  '}',

  '.blocklyFieldDropdown:not(.blocklyHidden) {',
    'display: block;',
  '}',

  '.blocklyIconGroup {',
    'cursor: default;',
  '}',

  '.blocklyIconGroup:not(:hover),',
  '.blocklyIconGroupReadonly {',
    'opacity: .6;',
  '}',

  '.blocklyIconShape {',
    'fill: #00f;',
    'stroke: #fff;',
    'stroke-width: 1px;',
  '}',

  '.blocklyIconSymbol {',
    'fill: #fff;',
  '}',

  '.blocklyMinimalBody {',
    'margin: 0;',
    'padding: 0;',
  '}',

  '.blocklyCommentForeignObject {',
    'position: relative;',
    'z-index: 0;',
  '}',

  '.blocklyCommentRect {',
    'fill: #E7DE8E;',
    'stroke: #bcA903;',
    'stroke-width: 1px',
  '}',

  '.blocklyCommentTarget {',
    'fill: transparent;',
    'stroke: #bcA903;',
  '}',

  '.blocklyCommentTargetFocused {',
    'fill: none;',
  '}',

  '.blocklyCommentHandleTarget {',
    'fill: none;',
  '}',

  '.blocklyCommentHandleTargetFocused {',
    'fill: transparent;',
  '}',

  '.blocklyFocused>.blocklyCommentRect {',
    'fill: #B9B272;',
    'stroke: #B9B272;',
  '}',

  '.blocklySelected>.blocklyCommentTarget {',
    'stroke: #fc3;',
    'stroke-width: 3px;',
  '}',


  '.blocklyCommentTextarea {',
    'background-color: #fef49c;',
    'border: 0;',
    'outline: 0;',
    'margin: 0;',
    'padding: 3px;',
    'resize: none;',
    'display: block;',
    'overflow: hidden;',
  '}',

  '.blocklyCommentDeleteIcon {',
    'cursor: pointer;',
    'fill: #000;',
    'display: none',
  '}',

  '.blocklySelected > .blocklyCommentDeleteIcon {',
    'display: block',
  '}',

  '.blocklyDeleteIconShape {',
    'fill: #000;',
    'stroke: #000;',
    'stroke-width: 1px;',
  '}',

  '.blocklyDeleteIconShape.blocklyDeleteIconHighlighted {',
    'stroke: #fc3;',
  '}',

  // Scratch Comments

  '.scratchCommentForeignObject {',
    'position: relative;',
  '}',

  '.scratchCommentBody {',
    'background-color: #fef49c;',
    'border-radius: 4px;',
  '}',

  '.scratchCommentRect {',
    'fill: #fef49c;',
  '}',

  '.scratchCommentTarget {',
    'fill: transparent;',
  '}',

  '.scratchWorkspaceCommentBorder {',
    'stroke: #bcA903;',
    'stroke-width: 1px;',
  '}',

  '.scratchCommentTargetFocused {',
    'fill: none;',
  '}',

  '.scratchCommentTopBar {',
    'fill: #000000;',
    'fill-opacity: 0.1',
  '}',

  '.scratchCommentText {',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 12pt;',
    'font-weight: 400;',
  '}',

  '.scratchCommentTextarea {',
    'background-color: #fef49c;',
    'border: 0;',
    'outline: 0;',
    'padding: 0;',
    'resize: none;',
    'overflow: hidden;',
  '}',

  '.scratchCommentTextarea::placeholder {',
    'color: rgba(0,0,0,0.5);',
    'font-style: italic;',
  '}',

  '.scratchCommentResizeSE {',
    'cursor: se-resize;',
    'fill: transparent;',
  '}',

  '.scratchCommentResizeSW {',
    'cursor: sw-resize;',
    'fill: transparent;',
  '}',

  '.blocklyHtmlInput {',
    'border: none;',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 12px;',
    'height: 100%;',
    'margin: 0;',
    'outline: none;',
    'box-sizing: border-box;',
    'width: 100%;',
    'text-align: center;',
    'color: #242731;',
    'font-weight: 500;',
  '}',

  '.blocklyMainBackground {',
    'stroke-width: 1;',
    'fill: var(--theme-color-500);',
  '}',

  '.blocklyMutatorBackground {',
    'fill: #fff;',
    'stroke: #ddd;',
    'stroke-width: 1;',
  '}',

  '.blocklyFlyoutBackground {',
    'fill: var(--theme-color-300);',
    'fill-opacity: .8;',
  '}',

  '.blocklyMainWorkspaceScrollbar {',
    'z-index: 20;',
  '}',

  '.blocklyFlyoutScrollbar {',
    'z-index: 30;',
  '}',

  '.blocklyFlyoutScrollbar.blocklyFlyoutScrollbarHidingAnimation {',
    'transform: translateX(-100%) !important;',
  '}',

  '.blocklyScrollbarHorizontal, .blocklyScrollbarVertical {',
    'position: absolute;',
    'outline: none;',
  '}',

  '.blocklyScrollbarBackground {',
    'opacity: 0;',
  '}',

  '.blocklyScrollbarHandle {',
    'fill: var(--theme-text-primary);',
    'fill-opacity: 0.3;',
  '}',

  '.blocklyScrollbarBackground:hover+.blocklyScrollbarHandle,',
  '.blocklyScrollbarHandle:hover {',
    'fill: $colour_scrollbarHover;',
  '}',

  '.blocklyZoom>image {',
    'opacity: 1;',
    'cursor: pointer;',
  '}',

  '.blocklyZoom image:nth-child(2) {',
    'transform: translateY(8px);',
  '}',

  '.blocklyZoom image:nth-child(3) {',
      'transform: translateY(-8px);',
  '}',

  /* Darken flyout scrollbars due to being on a grey background. */
  /* By contrast, workspace scrollbars are on a white background. */
  '.blocklyFlyout .blocklyScrollbarHandle {',
    'fill: #bbb;',
  '}',

  '.blocklyFlyout .blocklyScrollbarBackground:hover+.blocklyScrollbarHandle,',
  '.blocklyFlyout .blocklyScrollbarHandle:hover {',
    'fill: #aaa;',
  '}',

  '.blocklyInvalidInput {',
    'background: #faa;',
  '}',

  '.blocklyAngleCircle {',
    'stroke: ' + Blockly.Colours.motion.tertiary + ';',
    'stroke-width: 1;',
    'fill: ' + Blockly.Colours.motion.secondary + ';',
  '}',

  '.blocklyAngleCenterPoint {',
    'stroke: #fff;',
    'stroke-width: 1;',
    'fill: #fff;',
  '}',

  '.blocklyAngleDragHandle {',
    'stroke: #fff;',
    'stroke-width: 5;',
    'stroke-opacity: 0.25;',
    'fill: #fff;',
    'cursor: pointer;',
  '}',

  '.blocklyAngleDragArrow {',
    'pointer-events: none',
  '}',

  '.blocklyAngleMarks {',
    'stroke: #fff;',
    'stroke-width: 1;',
    'stroke-opacity: 0.5;',
  '}',

  '.blocklyAngleGauge {',
    'fill: #fff;',
    'fill-opacity: 0.20;',
  '}',

  '.blocklyAngleLine {',
    'stroke: #fff;',
    'stroke-width: 1;',
    'stroke-linecap: round;',
    'pointer-events: none;',
  '}',

  '.blocklyContextMenu {',
    'border-radius: 4px;',
    'max-height: 100%;',
  '}',

  '.blocklyDropdownMenu {',
    'padding: 0 !important;',
  '}',

  '.blocklyDropDownNumPad {',
    'background-color: $colour_numPadBackground;',
  '}',

  /* Override the default Closure URL. */
  '.blocklyWidgetDiv .goog-option-selected .goog-menuitem-checkbox,',
  '.blocklyWidgetDiv .goog-option-selected .goog-menuitem-icon {',
    'background: url(<<<PATH>>>/sprites.png) no-repeat -48px -16px !important;',
  '}',

  /* Category tree in Toolbox. */
  '.blocklyToolboxDiv {',
    'color: $colour_toolboxText;',
    'position: absolute;',
    'background: var(--theme-color-300);',
    'border: 1px solid var(--theme-color-200);',
    'border-radius: 8px;',
    'display: flex;',
    'overflow: hidden;',
    'flex-direction: column;',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'z-index: 40;', /* so blocks go over toolbox when dragging */
    '-webkit-tap-highlight-color: transparent;', /* issue #1345 */
    'transition: width 0.2s;',
  '}',

  '.blocklyToolboxDiv.collapsed .toolboxSwitchButton {',
    'transform: rotate(180deg);',
  '}',

  '.blocklyTreeRoot {',
    'padding: 4px 0;',
  '}',

  '.blocklyTreeRoot:focus {',
    'outline: none;',
  '}',

  '.blocklyTreeRow {',
    'height: 22px;',
    'line-height: 22px;',
    'margin-bottom: 3px;',
    'padding-right: 8px;',
    'white-space: nowrap;',
  '}',

  '.blocklyHorizontalTree {',
    'float: left;',
    'margin: 1px 5px 8px 0;',
  '}',

  '.blocklyHorizontalTreeRtl {',
    'float: right;',
    'margin: 1px 0 8px 5px;',
  '}',

  '.blocklyToolboxDiv[dir="RTL"] .blocklyTreeRow {',
    'margin-left: 8px;',
  '}',

  '.blocklyTreeRow:not(.blocklyTreeSelected):hover {',
    'background-color: #e4e4e4;',
  '}',

  '.blocklyTreeSeparator {',
    'border-bottom: solid #e5e5e5 1px;',
    'height: 0;',
    'margin: 5px 0;',
  '}',

  '.blocklyTreeSeparatorHorizontal {',
    'border-right: solid #e5e5e5 1px;',
    'width: 0;',
    'padding: 5px 0;',
    'margin: 0 5px;',
  '}',

  '.blocklyTreeIcon {',
    'background-image: url(<<<PATH>>>/sprites.png);',
    'height: 16px;',
    'vertical-align: middle;',
    'width: 16px;',
  '}',

  '.blocklyTreeIconClosedLtr {',
    'background-position: -32px -1px;',
  '}',

  '.blocklyTreeIconClosedRtl {',
    'background-position: 0px -1px;',
  '}',

  '.blocklyTreeIconOpen {',
    'background-position: -16px -1px;',
  '}',

  '.blocklyTreeSelected>.blocklyTreeIconClosedLtr {',
    'background-position: -32px -17px;',
  '}',

  '.blocklyTreeSelected>.blocklyTreeIconClosedRtl {',
    'background-position: 0px -17px;',
  '}',

  '.blocklyTreeSelected>.blocklyTreeIconOpen {',
    'background-position: -16px -17px;',
  '}',

  '.blocklyTreeIconNone,',
  '.blocklyTreeSelected>.blocklyTreeIconNone {',
    'background-position: -48px -1px;',
  '}',

  '.blocklyTreeLabel {',
    'cursor: default;',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 16px;',
    'padding: 0 3px;',
    'vertical-align: middle;',
  '}',

  '.blocklyToolboxDelete .blocklyTreeLabel {',
    'cursor: url("<<<PATH>>>/handdelete.cur"), auto;',
  '}',

  '.blocklyTreeSelected .blocklyTreeLabel {',
    'color: #fff;',
  '}',

  '.blocklyDropDownDiv .goog-slider-horizontal {',
    'margin: 8px;',
    'height: 22px;',
    'width: 150px;',
    'position: relative;',
    'outline: none;',
    'border-radius: 11px;',
    'margin-bottom: 20px;',
  '}',

  '.blocklyDropDownDiv .goog-slider-horizontal .goog-slider-thumb {',
    'width: 26px;',
    'height: 26px;',
    'top: -1px;',
    'position: absolute;',
    'background-color: white;',
    'border-radius: 100%;',
    '-webkit-box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.15);',
    '-moz-box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.15);',
    'box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.15);',
  '}',

  '.scratchEyedropper {',
    'background: none;',
    'outline: none;',
    'border: none;',
    'width: 100%;',
    'text-align: center;',
    'border-top: 1px solid #ddd;',
    'padding-top: 5px;',
    'cursor: pointer;',
  '}',

  '.scratchColourPickerLabel {',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 0.65rem;',
    'color: $colour_toolboxText;',
    'margin: 8px;',
  '}',

  '.scratchColourPickerLabelText {',
    'font-weight: bold;',
  '}',

  '.scratchColourPickerReadout {',
    'margin-left: 10px;',
  '}',

  '.scratchMatrixButtonDiv {',
    'width: 50%;',
    'text-align: center;',
    'float: left;',
  '}',

  '.scratchNotePickerKeyLabel {',
    'font-family: "Helvetica Neue", Helvetica, sans-serif;',
    'font-size: 0.75rem;',
    'fill: $colour_text;',
    'pointer-events: none;',
  '}',

  /* Copied from: goog/css/menu.css */
  /*
   * Copyright 2009 The Closure Library Authors. All Rights Reserved.
   *
   * Use of this source code is governed by the Apache License, Version 2.0.
   * See the COPYING file for details.
   */

  /**
   * Standard styling for menus created by goog.ui.MenuRenderer.
   *
   * @author attila@google.com (Attila Bodis)
   */

  '.blocklyWidgetDiv .goog-menu {',
    'cursor: default;',
    'font-size: 14px;',
    'background-color: var(--theme-color-300);',
    'border: 1px solid var(--theme-color-200);',
    'border-radius: 12px;',
    'box-shadow: 0px 2px 16px rgba(0, 0, 0, 0.5), 0px 26px 26px rgba(0, 0, 0, 0.15);',
    'transition: opacity 0.2s ease;',
    'padding: 8px 0px;',
    'min-width: 208px;',
    'outline: none;',
    'position: absolute;',
    'overflow: hidden;',
    'box-sizing: content-box;',
    'z-index: 20000;',  /* Arbitrary, but some apps depend on it... */
  '}',

  '.blocklyDropDownDiv .goog-menu {',
    'cursor: default;',
    'font: normal 13px "Helvetica Neue", Helvetica, sans-serif;',
    'outline: none;',
    'z-index: 20000;',  /* Arbitrary, but some apps depend on it... */
  '}',

  /* Copied from: goog/css/menuitem.css */
  /*
   * Copyright 2009 The Closure Library Authors. All Rights Reserved.
   *
   * Use of this source code is governed by the Apache License, Version 2.0.
   * See the COPYING file for details.
   */

  /**
   * Standard styling for menus created by goog.ui.MenuItemRenderer.
   *
   * @author attila@google.com (Attila Bodis)
   */

  /**
   * State: resting.
   *
   * NOTE(mleibman,chrishenry):
   * The RTL support in Closure is provided via two mechanisms -- "rtl" CSS
   * classes and BiDi flipping done by the CSS compiler.  Closure supports RTL
   * with or without the use of the CSS compiler.  In order for them not
   * to conflict with each other, the "rtl" CSS classes need to have the #noflip
   * annotation.  The non-rtl counterparts should ideally have them as well, but,
   * since .goog-menuitem existed without .goog-menuitem-rtl for so long before
   * being added, there is a risk of people having templates where they are not
   * rendering the .goog-menuitem-rtl class when in RTL and instead rely solely
   * on the BiDi flipping by the CSS compiler.  That's why we're not adding the
   * #noflip to .goog-menuitem.
   */
  '.blocklyWidgetDiv .goog-menuitem {',
    'color: var(--theme-text-primary);',
    'line-height: 20px;',
    'list-style: none;',
    'margin: 0;',
    'padding: 8px 16px;',
    'white-space: nowrap;',
  '}',

  '.blocklyDropDownDiv .goog-menuitem {',
    'color: #fff;',
    'font: normal 13px "Helvetica Neue", Helvetica, sans-serif;',
    'font-weight: bold;',
    'list-style: none;',
    'margin: 0;',
    'min-height: 24px;',
     /* 28px on the left for icon or checkbox; 7em on the right for shortcut. */
    'padding: 4px 7em 4px 28px;',
    'white-space: nowrap;',
  '}',

  /* BiDi override for the resting state. */
  /* #noflip */
  '.blocklyWidgetDiv .goog-menuitem.goog-menuitem-rtl, ',
  '.blocklyDropDownDiv .goog-menuitem.goog-menuitem-rtl {',
     /* Flip left/right padding for BiDi. */
    'padding-left: 7em;',
    'padding-right: 28px;',
  '}',

  /* If a menu doesn't have checkable items or items with icons, remove padding. */
  '.blocklyWidgetDiv .goog-menu-nocheckbox .goog-menuitem,',
  '.blocklyWidgetDiv .goog-menu-noicon .goog-menuitem, ',
  '.blocklyDropDownDiv .goog-menu-nocheckbox .goog-menuitem,',
  '.blocklyDropDownDiv .goog-menu-noicon .goog-menuitem { ',
    'padding-left: 12px;',
  '}',

  /*
   * If a menu doesn't have items with shortcuts, leave just enough room for
   * submenu arrows, if they are rendered.
   */
  '.blocklyWidgetDiv .goog-menu-noaccel .goog-menuitem, ',
  '.blocklyDropDownDiv .goog-menu-noaccel .goog-menuitem {',
    'padding-right: 20px;',
  '}',

  '.blocklyWidgetDiv .goog-menuitem-content ',
  '.blocklyDropDownDiv .goog-menuitem-content {',
    'color: #000;',
    'font: normal 13px "Helvetica Neue", Helvetica, sans-serif;',
  '}',

  /* State: disabled. */
  '.blocklyWidgetDiv .goog-menuitem-disabled .goog-menuitem-accel,',
  '.blocklyWidgetDiv .goog-menuitem-disabled .goog-menuitem-content, ',
  '.blocklyDropDownDiv .goog-menuitem-disabled .goog-menuitem-accel,',
  '.blocklyDropDownDiv .goog-menuitem-disabled .goog-menuitem-content {',
    'color: var(--theme-color-g500)',
  '}',

  '.blocklyWidgetDiv .goog-menuitem-disabled .goog-menuitem-icon, ',
  '.blocklyDropDownDiv .goog-menuitem-disabled .goog-menuitem-icon {',
    'opacity: 0.3;',
    '-moz-opacity: 0.3;',
    'filter: alpha(opacity=30);',
  '}',

  /* State: hover. */
  '.blocklyWidgetDiv .goog-menuitem-highlight,',
  '.blocklyWidgetDiv .goog-menuitem-hover {',
    'cursor: pointer;',
    'background-color: var(--theme-brand-color-p3);',
  '}',

  '.blocklyDropDownDiv .goog-menuitem-highlight,',
  '.blocklyDropDownDiv .goog-menuitem-hover {',
    'background-color: rgba(0, 0, 0, 0.2);',
  '}',

  /* State: selected/checked. */
  '.blocklyWidgetDiv .goog-menuitem-checkbox,',
  '.blocklyWidgetDiv .goog-menuitem-icon, ',
  '.blocklyDropDownDiv .goog-menuitem-checkbox,',
  '.blocklyDropDownDiv .goog-menuitem-icon {',
    'background-repeat: no-repeat;',
    'height: 16px;',
    'left: 6px;',
    'position: absolute;',
    'right: auto;',
    'vertical-align: middle;',
    'width: 16px;',
  '}',

  '.blocklyWidgetDiv .goog-option-selected .goog-menuitem-checkbox,',
  '.blocklyWidgetDiv .goog-option-selected .goog-menuitem-icon,',
  '.blocklyDropDownDiv .goog-option-selected .goog-menuitem-checkbox,',
  '.blocklyDropDownDiv .goog-option-selected .goog-menuitem-icon {',
     /* Client apps may override the URL at which they serve the sprite. */
    'background: url(<<<PATH>>>/sprites.png) no-repeat -48px -16px !important;',
    'position: static;', /* Scroll with the menu. */
    'float: left;',
    'margin-left: -24px;',
  '}',

  /* BiDi override for the selected/checked state. */
  /* #noflip */
  '.blocklyWidgetDiv .goog-menuitem-rtl .goog-menuitem-checkbox,',
  '.blocklyWidgetDiv .goog-menuitem-rtl .goog-menuitem-icon,',
  '.blocklyDropDownDiv .goog-menuitem-rtl .goog-menuitem-checkbox,',
  '.blocklyDropDownDiv .goog-menuitem-rtl .goog-menuitem-icon {',
     /* Flip left/right positioning. */
     'float: right;',
     'margin-right: -24px;',
  '}',

  /* Keyboard shortcut ("accelerator") style. */
  '.blocklyWidgetDiv .goog-menuitem-accel, ',
  '.blocklyDropDownDiv .goog-menuitem-accel {',
    'color: #999;',
     /* Keyboard shortcuts are untranslated; always left-to-right. */
     /* #noflip */
    'direction: ltr;',
    'left: auto;',
    'padding: 0 6px;',
    'position: absolute;',
    'right: 0;',
    'text-align: right;',
  '}',

  /* BiDi override for shortcut style. */
  /* #noflip */
  '.blocklyWidgetDiv .goog-menuitem-rtl .goog-menuitem-accel, ',
  '.blocklyDropDownDiv .goog-menuitem-rtl .goog-menuitem-accel {',
     /* Flip left/right positioning and text alignment. */
    'left: 0;',
    'right: auto;',
    'text-align: left;',
  '}',

  /* Mnemonic styles. */
  '.blocklyWidgetDiv .goog-menuitem-mnemonic-hint, ',
  '.blocklyDropDownDiv .goog-menuitem-mnemonic-hint {',
    'text-decoration: underline;',
  '}',

  '.blocklyWidgetDiv .goog-menuitem-mnemonic-separator, ',
  '.blocklyDropDownDiv .goog-menuitem-mnemonic-separator {',
    'color: #999;',
    'font-size: 12px;',
    'padding-left: 4px;',
  '}',

  /* Copied from: goog/css/menuseparator.css */
  /*
   * Copyright 2009 The Closure Library Authors. All Rights Reserved.
   *
   * Use of this source code is governed by the Apache License, Version 2.0.
   * See the COPYING file for details.
   */

  /**
   * Standard styling for menus created by goog.ui.MenuSeparatorRenderer.
   *
   * @author attila@google.com (Attila Bodis)
   */

  '.blocklyWidgetDiv .goog-menuseparator, ',
  '.blocklyDropDownDiv .goog-menuseparator {',
    'border-top: 1px solid #ccc;',
    'margin: 4px 0;',
    'padding: 0;',
  '}',

  '.blocklyFlyoutCheckbox {',
    'fill: white;',
    'stroke: #c8c8c8;',
  '}',

  '.checked > .blocklyFlyoutCheckbox {',
    'fill: ' + Blockly.Colours.motion.primary + ';',
    'stroke: ' + Blockly.Colours.motion.tertiary + ';',
  '}',

  '.disabled .blocklyTouchTargetBackground {',
    'cursor: var(--cursor_not_allowed);',
  '}',

  '.blocklyFlyoutCheckboxPath {',
    'fill: transparent;',
    'stroke: white;',
    'stroke-width: 3;',
    'stroke-linecap: round;',
    'stroke-linejoin: round;',
  '}',
  
  '.toolboxHeader {',
    'flex-shrink: 0;',
    'position: relative;',
    'padding: 2px;',
    'border-bottom: 1px solid var(--theme-color-350);',
  '}',

  '.toolboxBody {',
    'position: relative;',
    'display: flex;',
    'height: calc(100% - 29px);',
    'flex: 1;',
    'cursor: auto;',
  '}',

  '.dragStartInWorkspace .toolboxBody:hover::after {',
    'content: "";',
    'position: absolute;',
    'width: 100%;',
    'height: 100%;',
    'backdrop-filter: blur(10px);',
    'background-image: url("<<<PATH>>>/trash-can-open.svg");',
    'background-repeat: no-repeat;',
    'background-position: center center;',
    'background-size: 54px;',
    'pointer-events: none;',
    'z-index: 21;',
  '}',

  '.toolboxSwitchButton {',
    'width: 24px;',
    'height: 24px;',
    'cursor: pointer;',
    'background-image: url("<<<PATH>>>/chevron-right-double.svg");',
    'background-repeat: no-repeat;',
    'background-position: center center;',
    'background-size: contain;',
  '}',

  '.scratchCategoryMenu {',
    'flex-shrink: 0;',
    '-ms-flex-negative: 0;',
    'overflow-x: visible;',
    'overflow-y: auto;',
    'width: 68px;',
    'height: 100%;',
    'color: $colour_toolboxText;',
    'font-size: .7rem;',
    'user-select: none;',
    'border-right: 1px solid var(--theme-color-200);',
    '-webkit-user-select: none;',
    '-moz-user-select: none;',
    '-ms-user-select: none;',
  '}',

  '.scratchCategoryMenu::-webkit-scrollbar {',
    ' display: none;',
  '}',

  '.scratchCategoryMenuHorizontal {',
    'width: 100%;',
    'height: 50px;',
    'background: $colour_toolbox;',
    'color: $colour_toolboxText;',
    'font-size: .7em;',
    'user-select: none;',
    '-webkit-user-select: none;',
    '-moz-user-select: none;',
    '-ms-user-select: none;',
  '}',

  '.scratchCategoryMenuHorizontal .scratchCategoryMenuRow {',
    'float: left;',
    'margin: 3px;',
  '}',

  '.scratchCategoryMenuRow {',
  '}',

  '.scratchCategoryMenuItem {',
    'padding: 12px 0px;',
    'cursor: pointer;',
    'text-align: center;',
    'position: relative;',
  '}',

  '.scratchCategoryMenuItem:hover {',
    'background: var(--theme-color-200);',
  '}',

  '.scratchCategoryMenuItem::after {',
    'content: "";',
    'position: absolute;',
    'right: 0;',
    'top: 50%;',
    'width: 4px;',
    'height: 24px;',
    'transform: translateY(-50%);',
    'background-color: var(--secondaryColour);',
  '}',

  '.scratchCategoryMenuHorizontal .scratchCategoryMenuItem {',
    'padding: 6px 5px;',
  '}',

  '.scratchCategoryMenuItem.categorySelected {',
    'background: var(--theme-color-b200);',
  '}',

  '.scratchCategoryItemBubble {',
    'width: 1.25rem;',
    'height: 1.25rem;',
    'border: 1px solid;',
    'border-radius: 100%;',
    'margin: 0 auto 2px;',
  '}',

  '.scratchCategoryItemIcon {',
    'width: 24px;',
    'height: 24px;',
    'margin: 0 auto 2px;',
    'background-size: 100%;',
  '}',

  '.scratchCategoryMenuItemLabel {',
    'font-size: 14px;',
    'line-height: 20px;',
    'color: var(--theme-text-primary);',
  '}',
  ''
];
