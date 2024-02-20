/* eslint-disable max-len */
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
 * @fileoverview Utility methods.
 * These methods are not specific to Blockly, and could be factored out into
 * a JavaScript framework such as Closure.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * @name Blockly.utils
 * @namespace
 **/
goog.provide('Blockly.utils');

goog.require('Blockly.Touch');
goog.require('Blockly.FrameDragger');
goog.require('goog.dom');
goog.require('goog.events.BrowserFeature');
goog.require('goog.math.Coordinate');
goog.require('goog.userAgent');


/**
 * To allow ADVANCED_OPTIMIZATIONS, combining variable.name and variable['name']
 * is not possible. To access the exported Blockly.Msg.Something it needs to be
 * accessed through the exact name that was exported. Note, that all the exports
 * are happening as the last thing in the generated js files, so they won't be
 * accessible before JavaScript loads!
 * @return {!Object.<string, string>} The message array.
 * @private
 */
Blockly.utils.getMessageArray_ = function() {
  return goog.global['Blockly']['Msg'];
};

/**
 * Remove an attribute from a element even if it's in IE 10.
 * Similar to Element.removeAttribute() but it works on SVG elements in IE 10.
 * Sets the attribute to null in IE 10, which treats removeAttribute as a no-op
 * if it's called on an SVG element.
 * @param {!Element} element DOM element to remove attribute from.
 * @param {string} attributeName Name of attribute to remove.
 */
Blockly.utils.removeAttribute = function(element, attributeName) {
  // goog.userAgent.isVersion is deprecated, but the replacement is
  // goog.userAgent.isVersionOrHigher.
  if (goog.userAgent.IE && goog.userAgent.isVersion('10.0')) {
    element.setAttribute(attributeName, null);
  } else {
    element.removeAttribute(attributeName);
  }
};

/**
 * Add a CSS class to a element.
 * Similar to Closure's goog.dom.classes.add, except it handles SVG elements.
 * @param {!Element} element DOM element to add class to.
 * @param {string} className Name of class to add.
 * @return {boolean} True if class was added, false if already present.
 */
Blockly.utils.addClass = function(element, className) {
  var classes = element.getAttribute('class') || '';
  if ((' ' + classes + ' ').indexOf(' ' + className + ' ') != -1) {
    return false;
  }
  if (classes) {
    classes += ' ';
  }
  element.setAttribute('class', classes + className);
  return true;
};

/**
 * Remove a CSS class from a element.
 * Similar to Closure's goog.dom.classes.remove, except it handles SVG elements.
 * @param {!Element} element DOM element to remove class from.
 * @param {string} className Name of class to remove.
 * @return {boolean} True if class was removed, false if never present.
 */
Blockly.utils.removeClass = function(element, className) {
  var classes = element.getAttribute('class');
  if ((' ' + classes + ' ').indexOf(' ' + className + ' ') == -1) {
    return false;
  }
  var classList = classes.split(/\s+/);
  for (var i = 0; i < classList.length; i++) {
    if (!classList[i] || classList[i] == className) {
      classList.splice(i, 1);
      i--;
    }
  }
  if (classList.length) {
    element.setAttribute('class', classList.join(' '));
  } else {
    Blockly.utils.removeAttribute(element, 'class');
  }
  return true;
};

/**
 * Checks if an element has the specified CSS class.
 * Similar to Closure's goog.dom.classes.has, except it handles SVG elements.
 * @param {!Element} element DOM element to check.
 * @param {string} className Name of class to check.
 * @return {boolean} True if class exists, false otherwise.
 * @package
 */
Blockly.utils.hasClass = function(element, className) {
  var classes = element.getAttribute('class');
  return (' ' + classes + ' ').indexOf(' ' + className + ' ') != -1;
};

/**
 * Don't do anything for this event, just halt propagation.
 * @param {!Event} e An event.
 */
Blockly.utils.noEvent = function(e) {
  // This event has been handled.  No need to bubble up to the document.
  e.preventDefault();
  e.stopPropagation();
};

/**
 * Is this event targeting a text input widget?
 * @param {!Event} e An event.
 * @return {boolean} True if text input.
 */
Blockly.utils.isTargetInput = function(e) {
  return e.target.type == 'textarea' || e.target.type == 'text' ||
         e.target.type == 'number' || e.target.type == 'email' ||
         e.target.type == 'password' || e.target.type == 'search' ||
         e.target.type == 'tel' || e.target.type == 'url' ||
         e.target.isContentEditable;
};

/**
 * Return the coordinates of the top-left corner of this element relative to
 * its parent.  Only for SVG elements and children (e.g. rect, g, path).
 * @param {!Element} element SVG element to find the coordinates of.
 * @return {!goog.math.Coordinate} Object with .x and .y properties.
 */
Blockly.utils.getRelativeXY = function(element) {
  var xy = new goog.math.Coordinate(0, 0);
  // First, check for x and y attributes.
  var x = element.getAttribute('x');
  if (x) {
    xy.x = parseInt(x, 10);
  }
  var y = element.getAttribute('y');
  if (y) {
    xy.y = parseInt(y, 10);
  }
  // Second, check for transform="translate(...)" attribute.
  var transform = element.getAttribute('transform');
  var r = transform && transform.match(Blockly.utils.getRelativeXY.XY_REGEX_);
  if (r) {
    xy.x += parseFloat(r[1]);
    if (r[3]) {
      xy.y += parseFloat(r[3]);
    }
  }

  // Then check for style = transform: translate(...) or translate3d(...)
  var style = element.getAttribute('style');
  if (style && style.indexOf('translate') > -1) {
    var styleComponents = style.match(Blockly.utils.getRelativeXY.XY_STYLE_REGEX_);
    if (styleComponents) {
      xy.x += parseFloat(styleComponents[1]);
      if (styleComponents[3]) {
        xy.y += parseFloat(styleComponents[3]);
      }
    }
  }
  return xy;
};

/**
 * Return the coordinates of the top-left corner of this element relative to
 * the div blockly was injected into.
 * @param {!Element} element SVG element to find the coordinates of. If this is
 *     not a child of the div blockly was injected into, the behaviour is
 *     undefined.
 * @return {!goog.math.Coordinate} Object with .x and .y properties.
 */
Blockly.utils.getInjectionDivXY_ = function(element) {
  var x = 0;
  var y = 0;
  while (element) {
    var xy = Blockly.utils.getRelativeXY(element);
    var scale = Blockly.utils.getScale_(element);
    x = (x * scale) + xy.x;
    y = (y * scale) + xy.y;
    var classes = element.getAttribute('class') || '';
    if ((' ' + classes + ' ').indexOf(' injectionDiv ') != -1) {
      break;
    }
    element = element.parentNode;
  }
  return new goog.math.Coordinate(x, y);
};

Blockly.utils.getMouseVectorPosition = function(event, workspace) {
  var injectionDiv = workspace.getInjectionDiv();
  // Bounding rect coordinates are in client coordinates, meaning that they
  // are in pixels relative to the upper left corner of the visible browser
  // window.  These coordinates change when you scroll the browser window.
  var boundingRect = injectionDiv.getBoundingClientRect();

  // The client coordinates offset by the injection div's upper left corner.
  var clientOffsetPixels = new goog.math.Coordinate(
      event.clientX - boundingRect.left, event.clientY - boundingRect.top);

    // The offset in pixels between the main workspace's origin and the upper
    // left corner of the injection div.
  var mainOffsetPixels = workspace.getOriginOffsetInPixels();

  // The position of the new comment in pixels relative to the origin of the
  // main workspace.
  var finalOffsetPixels = goog.math.Coordinate.difference(clientOffsetPixels,
      mainOffsetPixels);

    // The position of the new comment in main workspace coordinates.
  var finalOffsetMainWs = finalOffsetPixels.scale(1 / workspace.scale);

  var commentX = finalOffsetMainWs.x;
  var commentY = finalOffsetMainWs.y;
  return {
    x: commentX,
    y: commentY
  };
};

/**
 * Return the scale of this element.
 * @param {!Element} element  The element to find the coordinates of.
 * @return {!number} number represending the scale applied to the element.
 * @private
 */
Blockly.utils.getScale_ = function(element) {
  var scale = 1;
  var transform = element.getAttribute('transform');
  if (transform) {
    var transformComponents =
        transform.match(Blockly.utils.getScale_.REGEXP_);
    if (transformComponents && transformComponents[0]) {
      scale = parseFloat(transformComponents[0]);
    }
  }
  return scale;
};

/**
 * Static regex to pull the x,y values out of an SVG translate() directive.
 * Note that Firefox and IE (9,10) return 'translate(12)' instead of
 * 'translate(12, 0)'.
 * Note that IE (9,10) returns 'translate(16 8)' instead of 'translate(16, 8)'.
 * Note that IE has been reported to return scientific notation (0.123456e-42).
 * @type {!RegExp}
 * @private
 */
Blockly.utils.getRelativeXY.XY_REGEX_ =
    /translate\(\s*([-+\d.e]+)([ ,]\s*([-+\d.e]+)\s*)?/;


/**
 * Static regex to pull the scale values out of a transform style property.
 * Accounts for same exceptions as XY_REGEXP_.
 * @type {!RegExp}
 * @private
 */
Blockly.utils.getScale_REGEXP_ = /scale\(\s*([-+\d.e]+)\s*\)/;

/**
 * Static regex to pull the x,y values out of a translate3d() or translate3d()
 * style property.
 * Accounts for same exceptions as XY_REGEXP_.
 * @type {!RegExp}
 * @private
 */
Blockly.utils.getRelativeXY.XY_STYLE_REGEX_ =
    /transform:\s*translate(?:3d)?\(\s*([-+\d.e]+)\s*px([ ,]\s*([-+\d.e]+)\s*px)?/;

/**
 * Helper method for creating SVG elements.
 * @param {string} name Element's tag name.
 * @param {!Object} attrs Dictionary of attribute names and values.
 * @param {Element} parent Optional parent on which to append the element.
 * @return {!SVGElement} Newly created SVG element.
 */
Blockly.utils.createSvgElement = function(name, attrs, parent /*, opt_workspace */) {
  var e = /** @type {!SVGElement} */
      (document.createElementNS(Blockly.SVG_NS, name));
  for (var key in attrs) {
    e.setAttribute(key, attrs[key]);
  }
  // IE defines a unique attribute "runtimeStyle", it is NOT applied to
  // elements created with createElementNS. However, Closure checks for IE
  // and assumes the presence of the attribute and crashes.
  if (document.body.runtimeStyle) {  // Indicates presence of IE-only attr.
    e.runtimeStyle = e.currentStyle = e.style;
  }
  if (parent) {
    parent.appendChild(e);
  }
  return e;
};

Blockly.utils.createMenuOptionNode = function(text, shortcutKey, textColor) {
  const element = goog.dom.createDom('div', {class: 'keyboard-shortcuts-item'});
  const textNode = goog.dom.createDom('span', {}, text);
  element.appendChild(textNode);
  if (textColor) {
    textNode.style.color = textColor;
  }
  if (shortcutKey) {
    const shortcutKeyNode = goog.dom.createDom('span', {class: 'keyboard-shortcuts'}, shortcutKey);
    element.appendChild(shortcutKeyNode);
  }
  return element;
};

/**
 * Is this event a right-click?
 * @param {!Event} e Mouse event.
 * @return {boolean} True if right-click.
 */
Blockly.utils.isRightButton = function(e) {
  if (e.ctrlKey && goog.userAgent.MAC) {
    // Control-clicking on Mac OS X is treated as a right-click.
    // WebKit on Mac OS X fails to change button to 2 (but Gecko does).
    return true;
  }
  return e.button == 2;
};

/**
 * is disabled
 * @param {!Event} e Mouse event.
 * @return {boolean} True if disable block click.
 */
Blockly.utils.isDisableBlockClickWithKeyCode = function(e) {
  if (e.metaKey && goog.userAgent.MAC) {
    // Control-clicking on Mac OS X disable gesture
    return true;
  }
  if (e.ctrlKey) {
    // Control-clicking on windows disable gesture
    return true;
  }
  return false;
};

/**
 * Whether the object is a dom object
 * @param {Object} object Object.
 * @return {boolean} True if the object is a dom object.
 */
Blockly.utils.isDom = typeof HTMLElement === 'object'
  ? function(object) {
    return object instanceof HTMLElement;
  }
  : function(object) {
    return object && typeof object === 'object' && object.nodeType === 1 && typeof object.nodeName === 'string';
  };

/**
 * Return the converted coordinates of the given mouse event.
 * The origin (0,0) is the top-left corner of the Blockly SVG.
 * @param {!Event} e Mouse event.
 * @param {!Element} svg SVG element.
 * @param {SVGMatrix} matrix Inverted screen CTM to use.
 * @return {!SVGPoint} Object with .x and .y properties.
 */
Blockly.utils.mouseToSvg = function(e, svg, matrix) {
  var svgPoint = svg.createSVGPoint();
  svgPoint.x = e.clientX;
  svgPoint.y = e.clientY;

  if (!matrix) {
    matrix = svg.getScreenCTM().inverse();
  }
  return svgPoint.matrixTransform(matrix);
};

/**
 * Given an array of strings, return the length of the shortest one.
 * @param {!Array.<string>} array Array of strings.
 * @return {number} Length of shortest string.
 */
Blockly.utils.shortestStringLength = function(array) {
  if (!array.length) {
    return 0;
  }
  return array.reduce(function(a, b) {
    return a.length < b.length ? a : b;
  }).length;
};

/**
 * Given an array of strings, return the length of the common prefix.
 * Words may not be split.  Any space after a word is included in the length.
 * @param {!Array.<string>} array Array of strings.
 * @param {number=} opt_shortest Length of shortest string.
 * @return {number} Length of common prefix.
 */
Blockly.utils.commonWordPrefix = function(array, opt_shortest) {
  if (!array.length) {
    return 0;
  } else if (array.length == 1) {
    return array[0].length;
  }
  var wordPrefix = 0;
  var max = opt_shortest || Blockly.utils.shortestStringLength(array);
  for (var len = 0; len < max; len++) {
    var letter = array[0][len];
    for (var i = 1; i < array.length; i++) {
      if (letter != array[i][len]) {
        return wordPrefix;
      }
    }
    if (letter == ' ') {
      wordPrefix = len + 1;
    }
  }
  for (var i = 1; i < array.length; i++) {
    var letter = array[i][len];
    if (letter && letter != ' ') {
      return wordPrefix;
    }
  }
  return max;
};

/**
 * Given an array of strings, return the length of the common suffix.
 * Words may not be split.  Any space after a word is included in the length.
 * @param {!Array.<string>} array Array of strings.
 * @param {number=} opt_shortest Length of shortest string.
 * @return {number} Length of common suffix.
 */
Blockly.utils.commonWordSuffix = function(array, opt_shortest) {
  if (!array.length) {
    return 0;
  } else if (array.length == 1) {
    return array[0].length;
  }
  var wordPrefix = 0;
  var max = opt_shortest || Blockly.utils.shortestStringLength(array);
  for (var len = 0; len < max; len++) {
    var letter = array[0].substr(-len - 1, 1);
    for (var i = 1; i < array.length; i++) {
      if (letter != array[i].substr(-len - 1, 1)) {
        return wordPrefix;
      }
    }
    if (letter == ' ') {
      wordPrefix = len + 1;
    }
  }
  for (var i = 1; i < array.length; i++) {
    var letter = array[i].charAt(array[i].length - len - 1);
    if (letter && letter != ' ') {
      return wordPrefix;
    }
  }
  return max;
};

/**
 * Parse a string with any number of interpolation tokens (%1, %2, ...).
 * It will also replace string table references (e.g., %{bky_my_msg} and
 * %{BKY_MY_MSG} will both be replaced with the value in
 * Blockly.Msg['MY_MSG']). Percentage sign characters '%' may be self-escaped
 * (e.g., '%%').
 * @param {string} message Text which might contain string table references and
 *     interpolation tokens.
 * @return {!Array.<string|number>} Array of strings and numbers.
 */
Blockly.utils.tokenizeInterpolation = function(message) {
  return Blockly.utils.tokenizeInterpolation_(message, true);
};

/**
 * Replaces string table references in a message, if the message is a string.
 * For example, "%{bky_my_msg}" and "%{BKY_MY_MSG}" will both be replaced with
 * the value in Blockly.Msg['MY_MSG'].
 * @param {string|?} message Message, which may be a string that contains
 *                           string table references.
 * @return {!string} String with message references replaced.
 */
Blockly.utils.replaceMessageReferences = function(message) {
  if (!goog.isString(message)) {
    return message;
  }
  var interpolatedResult = Blockly.utils.tokenizeInterpolation_(message, false);
  // When parseInterpolationTokens == false, interpolatedResult should be at
  // most length 1.
  return interpolatedResult.length ? interpolatedResult[0] : '';
};

/**
 * Validates that any %{BKY_...} references in the message refer to keys of
 * the Blockly.Msg string table.
 * @param {string} message Text which might contain string table references.
 * @return {boolean} True if all message references have matching values.
 *     Otherwise, false.
 */
Blockly.utils.checkMessageReferences = function(message) {
  var isValid = true;  // True until a bad reference is found.

  var regex = /%{BKY_([a-zA-Z][a-zA-Z0-9_]*)}/g;
  var match = regex.exec(message);
  while (match) {
    var msgKey = match[1];
    if (Blockly.utils.getMessageArray_()[msgKey] == undefined) {
      console.log('WARNING: No message string for %{BKY_' + msgKey + '}.');
      isValid = false;
    }

    // Re-run on remainder of string.
    message = message.substring(match.index + msgKey.length + 1);
    match = regex.exec(message);
  }

  return isValid;
};

/**
 * Internal implementation of the message reference and interpolation token
 * parsing used by tokenizeInterpolation() and replaceMessageReferences().
 * @param {string} message Text which might contain string table references and
 *     interpolation tokens.
 * @param {boolean} parseInterpolationTokens Option to parse numeric
 *     interpolation tokens (%1, %2, ...) when true.
 * @return {!Array.<string|number>} Array of strings and numbers.
 * @private
 */
Blockly.utils.tokenizeInterpolation_ = function(message,
    parseInterpolationTokens) {
  var tokens = [];
  var chars = message.split('');
  chars.push('');  // End marker.
  // Parse the message with a finite state machine.
  // 0 - Base case.
  // 1 - % found.
  // 2 - Digit found.
  // 3 - Message ref found.
  var state = 0;
  var buffer = [];
  var number = null;
  for (var i = 0; i < chars.length; i++) {
    var c = chars[i];
    if (state == 0) {
      if (c == '%') {
        var text = buffer.join('');
        if (text) {
          tokens.push(text);
        }
        buffer.length = 0;
        state = 1;  // Start escape.
      } else {
        buffer.push(c);  // Regular char.
      }
    } else if (state == 1) {
      if (c == '%') {
        buffer.push(c);  // Escaped %: %%
        state = 0;
      } else if (parseInterpolationTokens && '0' <= c && c <= '9') {
        state = 2;
        number = c;
        var text = buffer.join('');
        if (text) {
          tokens.push(text);
        }
        buffer.length = 0;
      } else if (c == '{') {
        state = 3;
      } else {
        buffer.push('%', c);  // Not recognized. Return as literal.
        state = 0;
      }
    } else if (state == 2) {
      if ('0' <= c && c <= '9') {
        number += c;  // Multi-digit number.
      } else {
        tokens.push(parseInt(number, 10));
        i--;  // Parse this char again.
        state = 0;
      }
    } else if (state == 3) {  // String table reference
      if (c == '') {
        // Premature end before closing '}'
        buffer.splice(0, 0, '%{'); // Re-insert leading delimiter
        i--;  // Parse this char again.
        state = 0; // and parse as string literal.
      } else if (c != '}') {
        buffer.push(c);
      } else  {
        var rawKey = buffer.join('');
        if (/[a-zA-Z][a-zA-Z0-9_]*/.test(rawKey)) {  // Strict matching
          // Found a valid string key. Attempt case insensitive match.
          var keyUpper = rawKey.toUpperCase();

          // BKY_ is the prefix used to namespace the strings used in Blockly
          // core files and the predefined blocks in ../blocks/. These strings
          // are defined in ../msgs/ files.
          var bklyKey = goog.string.startsWith(keyUpper, 'BKY_') ?
              keyUpper.substring(4) : null;
          if (bklyKey && bklyKey in Blockly.Msg) {
            var rawValue = Blockly.Msg[bklyKey];
            if (goog.isString(rawValue)) {
              // Attempt to dereference substrings, too, appending to the end.
              Array.prototype.push.apply(tokens,
                  Blockly.utils.tokenizeInterpolation(rawValue));
            } else if (parseInterpolationTokens) {
              // When parsing interpolation tokens, numbers are special
              // placeholders (%1, %2, etc). Make sure all other values are
              // strings.
              tokens.push(String(rawValue));
            } else {
              tokens.push(rawValue);
            }
          } else {
            // No entry found in the string table. Pass reference as string.
            tokens.push('%{' + rawKey + '}');
          }
          buffer.length = 0;  // Clear the array
          state = 0;
        } else {
          tokens.push('%{' + rawKey + '}');
          buffer.length = 0;
          state = 0; // and parse as string literal.
        }
      }
    }
  }
  var text = buffer.join('');
  if (text) {
    tokens.push(text);
  }

  // Merge adjacent text tokens into a single string.
  var mergedTokens = [];
  buffer.length = 0;
  for (var i = 0; i < tokens.length; ++i) {
    if (typeof tokens[i] == 'string') {
      buffer.push(tokens[i]);
    } else {
      text = buffer.join('');
      if (text) {
        mergedTokens.push(text);
      }
      buffer.length = 0;
      mergedTokens.push(tokens[i]);
    }
  }
  text = buffer.join('');
  if (text) {
    mergedTokens.push(text);
  }
  buffer.length = 0;

  return mergedTokens;
};

/**
 * Generate a unique ID.  This should be globally unique.
 * 87 characters ^ 20 length > 128 bits (better than a UUID).
 * @return {string} A globally unique ID string.
 */
Blockly.utils.genUid = function() {
  var length = 20;
  var soupLength = Blockly.utils.genUid.soup_.length;
  var id = [];
  for (var i = 0; i < length; i++) {
    id[i] = Blockly.utils.genUid.soup_.charAt(Math.random() * soupLength);
  }
  return id.join('');
};

/**
 * Legal characters for the unique ID.  Should be all on a US keyboard.
 * No characters that conflict with XML or JSON.  Requests to remove additional
 * 'problematic' characters from this soup will be denied.  That's your failure
 * to properly escape in your own environment.  Issues #251, #625, #682, #1304.
 * @private
 */
Blockly.utils.genUid.soup_ = '!#$%()*+,-./:;=?@[]^_`{|}~' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Wrap text to the specified width.
 * @param {string} text Text to wrap.
 * @param {number} limit Width to wrap each line.
 * @return {string} Wrapped text.
 */
Blockly.utils.wrap = function(text, limit) {
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    lines[i] = Blockly.utils.wrapLine_(lines[i], limit);
  }
  return lines.join('\n');
};

/**
 * Wrap single line of text to the specified width.
 * @param {string} text Text to wrap.
 * @param {number} limit Width to wrap each line.
 * @return {string} Wrapped text.
 * @private
 */
Blockly.utils.wrapLine_ = function(text, limit) {
  if (text.length <= limit) {
    // Short text, no need to wrap.
    return text;
  }
  // Split the text into words.
  var words = text.trim().split(/\s+/);
  // Set limit to be the length of the largest word.
  for (var i = 0; i < words.length; i++) {
    if (words[i].length > limit) {
      limit = words[i].length;
    }
  }

  var lastScore;
  var score = -Infinity;
  var lastText;
  var lineCount = 1;
  do {
    lastScore = score;
    lastText = text;
    // Create a list of booleans representing if a space (false) or
    // a break (true) appears after each word.
    var wordBreaks = [];
    // Seed the list with evenly spaced linebreaks.
    var steps = words.length / lineCount;
    var insertedBreaks = 1;
    for (var i = 0; i < words.length - 1; i++) {
      if (insertedBreaks < (i + 1.5) / steps) {
        insertedBreaks++;
        wordBreaks[i] = true;
      } else {
        wordBreaks[i] = false;
      }
    }
    wordBreaks = Blockly.utils.wrapMutate_(words, wordBreaks, limit);
    score = Blockly.utils.wrapScore_(words, wordBreaks, limit);
    text = Blockly.utils.wrapToText_(words, wordBreaks);
    lineCount++;
  } while (score > lastScore);
  return lastText;
};

/**
 * Compute a score for how good the wrapping is.
 * @param {!Array.<string>} words Array of each word.
 * @param {!Array.<boolean>} wordBreaks Array of line breaks.
 * @param {number} limit Width to wrap each line.
 * @return {number} Larger the better.
 * @private
 */
Blockly.utils.wrapScore_ = function(words, wordBreaks, limit) {
  // If this function becomes a performance liability, add caching.
  // Compute the length of each line.
  var lineLengths = [0];
  var linePunctuation = [];
  for (var i = 0; i < words.length; i++) {
    lineLengths[lineLengths.length - 1] += words[i].length;
    if (wordBreaks[i] === true) {
      lineLengths.push(0);
      linePunctuation.push(words[i].charAt(words[i].length - 1));
    } else if (wordBreaks[i] === false) {
      lineLengths[lineLengths.length - 1]++;
    }
  }
  var maxLength = Math.max.apply(Math, lineLengths);

  var score = 0;
  for (var i = 0; i < lineLengths.length; i++) {
    // Optimize for width.
    // -2 points per char over limit (scaled to the power of 1.5).
    score -= Math.pow(Math.abs(limit - lineLengths[i]), 1.5) * 2;
    // Optimize for even lines.
    // -1 point per char smaller than max (scaled to the power of 1.5).
    score -= Math.pow(maxLength - lineLengths[i], 1.5);
    // Optimize for structure.
    // Add score to line endings after punctuation.
    if ('.?!'.indexOf(linePunctuation[i]) != -1) {
      score += limit / 3;
    } else if (',;)]}'.indexOf(linePunctuation[i]) != -1) {
      score += limit / 4;
    }
  }
  // All else being equal, the last line should not be longer than the
  // previous line.  For example, this looks wrong:
  // aaa bbb
  // ccc ddd eee
  if (lineLengths.length > 1 && lineLengths[lineLengths.length - 1] <=
      lineLengths[lineLengths.length - 2]) {
    score += 0.5;
  }
  return score;
};

/**
 * Mutate the array of line break locations until an optimal solution is found.
 * No line breaks are added or deleted, they are simply moved around.
 * @param {!Array.<string>} words Array of each word.
 * @param {!Array.<boolean>} wordBreaks Array of line breaks.
 * @param {number} limit Width to wrap each line.
 * @return {!Array.<boolean>} New array of optimal line breaks.
 * @private
 */
Blockly.utils.wrapMutate_ = function(words, wordBreaks, limit) {
  var bestScore = Blockly.utils.wrapScore_(words, wordBreaks, limit);
  var bestBreaks;
  // Try shifting every line break forward or backward.
  for (var i = 0; i < wordBreaks.length - 1; i++) {
    if (wordBreaks[i] == wordBreaks[i + 1]) {
      continue;
    }
    var mutatedWordBreaks = [].concat(wordBreaks);
    mutatedWordBreaks[i] = !mutatedWordBreaks[i];
    mutatedWordBreaks[i + 1] = !mutatedWordBreaks[i + 1];
    var mutatedScore =
        Blockly.utils.wrapScore_(words, mutatedWordBreaks, limit);
    if (mutatedScore > bestScore) {
      bestScore = mutatedScore;
      bestBreaks = mutatedWordBreaks;
    }
  }
  if (bestBreaks) {
    // Found an improvement.  See if it may be improved further.
    return Blockly.utils.wrapMutate_(words, bestBreaks, limit);
  }
  // No improvements found.  Done.
  return wordBreaks;
};

/**
 * Reassemble the array of words into text, with the specified line breaks.
 * @param {!Array.<string>} words Array of each word.
 * @param {!Array.<boolean>} wordBreaks Array of line breaks.
 * @return {string} Plain text.
 * @private
 */
Blockly.utils.wrapToText_ = function(words, wordBreaks) {
  var text = [];
  for (var i = 0; i < words.length; i++) {
    text.push(words[i]);
    if (wordBreaks[i] !== undefined) {
      text.push(wordBreaks[i] ? '\n' : ' ');
    }
  }
  return text.join('');
};

/**
 * Check if 3D transforms are supported by adding an element
 * and attempting to set the property.
 * @return {boolean} true if 3D transforms are supported.
 */
Blockly.utils.is3dSupported = function() {
  if (Blockly.utils.is3dSupported.cached_ !== undefined) {
    return Blockly.utils.is3dSupported.cached_;
  }
  // CC-BY-SA Lorenzo Polidori
  // stackoverflow.com/questions/5661671/detecting-transform-translate3d-support
  if (!goog.global.getComputedStyle) {
    return false;
  }

  var el = document.createElement('p');
  var has3d = 'none';
  var transforms = {
    'webkitTransform': '-webkit-transform',
    'OTransform': '-o-transform',
    'msTransform': '-ms-transform',
    'MozTransform': '-moz-transform',
    'transform': 'transform'
  };

  // Add it to the body to get the computed style.
  document.body.insertBefore(el, null);

  for (var t in transforms) {
    if (el.style[t] !== undefined) {
      el.style[t] = 'translate3d(1px,1px,1px)';
      var computedStyle = goog.global.getComputedStyle(el);
      if (!computedStyle) {
        // getComputedStyle in Firefox returns null when blockly is loaded
        // inside an iframe with display: none.  Returning false and not
        // caching is3dSupported means we try again later.  This is most likely
        // when users are interacting with blocks which should mean blockly is
        // visible again.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=548397
        document.body.removeChild(el);
        return false;
      }
      has3d = computedStyle.getPropertyValue(transforms[t]);
    }
  }
  document.body.removeChild(el);
  Blockly.utils.is3dSupported.cached_ = has3d !== 'none';
  return Blockly.utils.is3dSupported.cached_;
};

/**
 * Insert a node after a reference node.
 * Contrast with node.insertBefore function.
 * @param {!Element} newNode New element to insert.
 * @param {!Element} refNode Existing element to precede new node.
 * @package
 */
Blockly.utils.insertAfter = function(newNode, refNode) {
  var siblingNode = refNode.nextSibling;
  var parentNode = refNode.parentNode;
  if (!parentNode) {
    throw 'Reference node has no parent.';
  }
  if (siblingNode) {
    parentNode.insertBefore(newNode, siblingNode);
  } else {
    parentNode.appendChild(newNode);
  }
};

/**
 * Calls a function after the page has loaded, possibly immediately.
 * @param {function()} fn Function to run.
 * @throws Error Will throw if no global document can be found (e.g., Node.js).
 */
Blockly.utils.runAfterPageLoad = function(fn) {
  if (!document) {
    throw new Error('Blockly.utils.runAfterPageLoad() requires browser document.');
  }
  if (document.readyState === 'complete') {
    fn();  // Page has already loaded. Call immediately.
  } else {
    // Poll readyState.
    var readyStateCheckInterval = setInterval(function() {
      if (document.readyState === 'complete') {
        clearInterval(readyStateCheckInterval);
        fn();
      }
    }, 10);
  }
};

/**
 * Sets the CSS transform property on an element. This function sets the
 * non-vendor-prefixed and vendor-prefixed versions for backwards compatibility
 * with older browsers. See http://caniuse.com/#feat=transforms2d
 * @param {!Element} node The node which the CSS transform should be applied.
 * @param {string} transform The value of the CSS `transform` property.
 */
Blockly.utils.setCssTransform = function(node, transform) {
  node.style['transform'] = transform;
  node.style['-webkit-transform'] = transform;
};

/**
 * Get the position of the current viewport in window coordinates.  This takes
 * scroll into account.
 * @return {!Object} an object containing window width, height, and scroll
 *     position in window coordinates.
 * @package
 */
Blockly.utils.getViewportBBox = function() {
  // Pixels.
  var windowSize = goog.dom.getViewportSize();
  // Pixels, in window coordinates.
  var scrollOffset = goog.style.getViewportPageOffset(document);
  return {
    right: windowSize.width + scrollOffset.x,
    bottom: windowSize.height + scrollOffset.y,
    top: scrollOffset.y,
    left: scrollOffset.x
  };
};

/**
 * Fast prefix-checker.
 * Copied from Closure's goog.string.startsWith.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of `str`.
 * @return {boolean} True if `str` begins with `prefix`.
 * @package
 */
Blockly.utils.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};

/**
 * Converts degrees to radians.
 * Copied from Closure's goog.math.toRadians.
 * @param {number} angleDegrees Angle in degrees.
 * @return {number} Angle in radians.
 * @package
 */
Blockly.utils.toRadians = function(angleDegrees) {
  return angleDegrees * Math.PI / 180;
};

/**
 * Show a toast message.
 * @param {String} text The text to display.
 * @package
 */
Blockly.utils.toast = function(text) {
  alert(text);
};

/**
 * Whether to disable the newly created variable
 * @param {Boolean} isLocal Whether the variable is locally scoped.
 * @return {boolean} True if the new variable should be disabled.
 * @package
 */
Blockly.utils.getNewVariableIsDisabled = function() {
  return false;
};

Blockly.utils.BLOCKS_ICONS = [
  [
    /"[\S]+?repeat\.svg"/gm,
    "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIxLjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9InJlcGVhdCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiCgkgdmlld0JveD0iMCAwIDI0IDI0IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNCAyNDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNDRjhCMTc7fQoJLnN0MXtmaWxsOiNGRkZGRkY7fQo8L3N0eWxlPgo8dGl0bGU+cmVwZWF0PC90aXRsZT4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTIzLjMsMTFjLTAuMywwLjYtMC45LDEtMS41LDFoLTEuNmMtMC4xLDEuMy0wLjUsMi41LTEuMSwzLjZjLTAuOSwxLjctMi4zLDMuMi00LjEsNC4xCgljLTEuNywwLjktMy42LDEuMi01LjUsMC45Yy0xLjgtMC4zLTMuNS0xLjEtNC45LTIuM2MtMC43LTAuNy0wLjctMS45LDAtMi42YzAuNi0wLjYsMS42LTAuNywyLjMtMC4ySDdjMC45LDAuNiwxLjksMC45LDIuOSwwLjkKCXMxLjktMC4zLDIuNy0wLjljMS4xLTAuOCwxLjgtMi4xLDEuOC0zLjVoLTEuNWMtMC45LDAtMS43LTAuNy0xLjctMS43YzAtMC40LDAuMi0wLjksMC41LTEuMmw0LjQtNC40YzAuNy0wLjYsMS43LTAuNiwyLjQsMEwyMyw5LjIKCUMyMy41LDkuNywyMy42LDEwLjQsMjMuMywxMXoiLz4KPHBhdGggY2xhc3M9InN0MSIgZD0iTTIxLjgsMTFoLTIuNmMwLDEuNS0wLjMsMi45LTEsNC4yYy0wLjgsMS42LTIuMSwyLjgtMy43LDMuNmMtMS41LDAuOC0zLjMsMS4xLTQuOSwwLjhjLTEuNi0wLjItMy4yLTEtNC40LTIuMQoJYy0wLjQtMC4zLTAuNC0wLjktMC4xLTEuMmMwLjMtMC40LDAuOS0wLjQsMS4yLTAuMWwwLDBjMSwwLjcsMi4yLDEuMSwzLjQsMS4xczIuMy0wLjMsMy4zLTFjMC45LTAuNiwxLjYtMS41LDItMi42CgljMC4zLTAuOSwwLjQtMS44LDAuMi0yLjhoLTIuNGMtMC40LDAtMC43LTAuMy0wLjctMC43YzAtMC4yLDAuMS0wLjMsMC4yLTAuNGw0LjQtNC40YzAuMy0wLjMsMC43LTAuMywwLjksMEwyMiw5LjgKCWMwLjMsMC4zLDAuNCwwLjYsMC4zLDAuOVMyMiwxMSwyMS44LDExeiIvPgo8L3N2Zz4K"
  ],
  [
    /"[\S]+?green-flag\.svg"/gm,
    "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDIxLjAuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9ImdyZWVuZmxhZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiCgkgdmlld0JveD0iMCAwIDI0IDI0IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAyNCAyNDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiM0NTk5M0Q7fQoJLnN0MXtmaWxsOiM0Q0JGNTY7fQo8L3N0eWxlPgo8dGl0bGU+Z3JlZW5mbGFnPC90aXRsZT4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTIwLjgsMy43Yy0wLjQtMC4yLTAuOS0wLjEtMS4yLDAuMmMtMiwxLjYtNC44LDEuNi02LjgsMGMtMi4zLTEuOS01LjYtMi4zLTguMy0xVjIuNWMwLTAuNi0wLjUtMS0xLTEKCXMtMSwwLjQtMSwxdjE4LjhjMCwwLjUsMC41LDEsMSwxaDAuMWMwLjUsMCwxLTAuNSwxLTF2LTYuNGMxLTAuNywyLjEtMS4yLDMuNC0xLjNjMS4yLDAsMi40LDAuNCwzLjQsMS4yYzIuOSwyLjMsNywyLjMsOS44LDAKCWMwLjMtMC4yLDAuNC0wLjUsMC40LTAuOVY0LjdDMjEuNiw0LjIsMjEuMywzLjgsMjAuOCwzLjd6IE0yMC41LDEzLjlDMjAuNSwxMy45LDIwLjUsMTMuOSwyMC41LDEzLjlDMTgsMTYsMTQuNCwxNiwxMS45LDE0CgljLTEuMS0wLjktMi41LTEuNC00LTEuNGMtMS4yLDAuMS0yLjMsMC41LTMuNCwxLjFWNEM3LDIuNiwxMCwyLjksMTIuMiw0LjZjMi40LDEuOSw1LjcsMS45LDguMSwwYzAuMSwwLDAuMSwwLDAuMiwwCgljMCwwLDAuMSwwLjEsMC4xLDAuMUwyMC41LDEzLjl6Ii8+CjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yMC42LDQuOGwtMC4xLDkuMWMwLDAsMCwwLjEsMCwwLjFjLTIuNSwyLTYuMSwyLTguNiwwYy0xLjEtMC45LTIuNS0xLjQtNC0xLjRjLTEuMiwwLjEtMi4zLDAuNS0zLjQsMS4xVjQKCUM3LDIuNiwxMCwyLjksMTIuMiw0LjZjMi40LDEuOSw1LjcsMS45LDguMSwwYzAuMSwwLDAuMSwwLDAuMiwwQzIwLjUsNC43LDIwLjYsNC43LDIwLjYsNC44eiIvPgo8L3N2Zz4K"
  ],
  [
    /"[\S]+?rotate-left\.svg"/gm,
    "data:image/svg+xml;base64,PHN2ZyBpZD0icm90YXRlLWNsb2Nrd2lzZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojM2Q3OWNjO30uY2xzLTJ7ZmlsbDojZmZmO308L3N0eWxlPjwvZGVmcz48dGl0bGU+cm90YXRlLWNsb2Nrd2lzZTwvdGl0bGU+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjAuMzQsMTguMjFhMTAuMjQsMTAuMjQsMCwwLDEtOC4xLDQuMjIsMi4yNiwyLjI2LDAsMCwxLS4xNi00LjUyaDBhNS41OCw1LjU4LDAsMCwwLDQuMjUtMi41Myw1LjA2LDUuMDYsMCwwLDAsLjU0LTQuNjJBNC4yNSw0LjI1LDAsMCwwLDE1LjU1LDlhNC4zMSw0LjMxLDAsMCwwLTItLjhBNC44Miw0LjgyLDAsMCwwLDEwLjQsOWwxLjEyLDEuNDFBMS41OSwxLjU5LDAsMCwxLDEwLjM2LDEzSDIuNjdhMS41NiwxLjU2LDAsMCwxLTEuMjYtLjYzQTEuNTQsMS41NCwwLDAsMSwxLjEzLDExTDIuODUsMy41N0ExLjU5LDEuNTksMCwwLDEsNC4zOCwyLjQsMS41NywxLjU3LDAsMCwxLDUuNjIsM0w2LjcsNC4zNWExMC42NiwxMC42NiwwLDAsMSw3LjcyLTEuNjhBOS44OCw5Ljg4LDAsMCwxLDE5LDQuODEsOS42MSw5LjYxLDAsMCwxLDIxLjgzLDksMTAuMDgsMTAuMDgsMCwwLDEsMjAuMzQsMTguMjFaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNMTkuNTYsMTcuNjVhOS4yOSw5LjI5LDAsMCwxLTcuMzUsMy44MywxLjMxLDEuMzEsMCwwLDEtLjA4LTIuNjIsNi41Myw2LjUzLDAsMCwwLDUtMi45Miw2LjA1LDYuMDUsMCwwLDAsLjY3LTUuNTEsNS4zMiw1LjMyLDAsMCwwLTEuNjQtMi4xNiw1LjIxLDUuMjEsMCwwLDAtMi40OC0xQTUuODYsNS44NiwwLDAsMCw5LDguODRMMTAuNzQsMTFhLjU5LjU5LDAsMCwxLS40MywxSDIuN2EuNi42LDAsMCwxLS42LS43NUwzLjgxLDMuODNhLjU5LjU5LDAsMCwxLDEtLjIxbDEuNjcsMi4xYTkuNzEsOS43MSwwLDAsMSw3Ljc1LTIuMDcsOC44NCw4Ljg0LDAsMCwxLDQuMTIsMS45Miw4LjY4LDguNjgsMCwwLDEsMi41NCwzLjcyQTkuMTQsOS4xNCwwLDAsMSwxOS41NiwxNy42NVoiLz48L3N2Zz4="
  ],
  [
    /"[\S]+?rotate-right\.svg"/gm,
    "data:image/svg+xml;base64,PHN2ZyBpZD0icm90YXRlLWNvdW50ZXItY2xvY2t3aXNlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMzZDc5Y2M7fS5jbHMtMntmaWxsOiNmZmY7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5yb3RhdGUtY291bnRlci1jbG9ja3dpc2U8L3RpdGxlPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTIyLjY4LDEyLjJhMS42LDEuNiwwLDAsMS0xLjI3LjYzSDEzLjcyYTEuNTksMS41OSwwLDAsMS0xLjE2LTIuNThsMS4xMi0xLjQxYTQuODIsNC44MiwwLDAsMC0zLjE0LS43Nyw0LjMxLDQuMzEsMCwwLDAtMiwuOCw0LjI1LDQuMjUsMCwwLDAtMS4zNCwxLjczLDUuMDYsNS4wNiwwLDAsMCwuNTQsNC42MkE1LjU4LDUuNTgsMCwwLDAsMTIsMTcuNzRoMGEyLjI2LDIuMjYsMCwwLDEtLjE2LDQuNTJBMTAuMjUsMTAuMjUsMCwwLDEsMy43NCwxOCwxMC4xNCwxMC4xNCwwLDAsMSwyLjI1LDguNzgsOS43LDkuNywwLDAsMSw1LjA4LDQuNjQsOS45Miw5LjkyLDAsMCwxLDkuNjYsMi41YTEwLjY2LDEwLjY2LDAsMCwxLDcuNzIsMS42OGwxLjA4LTEuMzVhMS41NywxLjU3LDAsMCwxLDEuMjQtLjYsMS42LDEuNiwwLDAsMSwxLjU0LDEuMjFsMS43LDcuMzdBMS41NywxLjU3LDAsMCwxLDIyLjY4LDEyLjJaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNMjEuMzgsMTEuODNIMTMuNzdhLjU5LjU5LDAsMCwxLS40My0xbDEuNzUtMi4xOWE1LjksNS45LDAsMCwwLTQuNy0xLjU4LDUuMDcsNS4wNywwLDAsMC00LjExLDMuMTdBNiw2LDAsMCwwLDcsMTUuNzdhNi41MSw2LjUxLDAsMCwwLDUsMi45MiwxLjMxLDEuMzEsMCwwLDEtLjA4LDIuNjIsOS4zLDkuMywwLDAsMS03LjM1LTMuODJBOS4xNiw5LjE2LDAsMCwxLDMuMTcsOS4xMiw4LjUxLDguNTEsMCwwLDEsNS43MSw1LjQsOC43Niw4Ljc2LDAsMCwxLDkuODIsMy40OGE5LjcxLDkuNzEsMCwwLDEsNy43NSwyLjA3bDEuNjctMi4xYS41OS41OSwwLDAsMSwxLC4yMUwyMiwxMS4wOEEuNTkuNTksMCwwLDEsMjEuMzgsMTEuODNaIi8+PC9zdmc+"
  ],
  [
    /"[\S]+?dropdown-arrow\.svg"/gm,
    "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMi43MSIgaGVpZ2h0PSI4Ljc5IiB2aWV3Qm94PSIwIDAgMTIuNzEgOC43OSI+PHRpdGxlPmRyb3Bkb3duLWFycm93PC90aXRsZT48ZyBvcGFjaXR5PSIwLjEiPjxwYXRoIGQ9Ik0xMi43MSwyLjQ0QTIuNDEsMi40MSwwLDAsMSwxMiw0LjE2TDguMDgsOC4wOGEyLjQ1LDIuNDUsMCwwLDEtMy40NSwwTDAuNzIsNC4xNkEyLjQyLDIuNDIsMCwwLDEsMCwyLjQ0LDIuNDgsMi40OCwwLDAsMSwuNzEuNzFDMSwwLjQ3LDEuNDMsMCw2LjM2LDBTMTEuNzUsMC40NiwxMiwuNzFBMi40NCwyLjQ0LDAsMCwxLDEyLjcxLDIuNDRaIiBmaWxsPSIjMjMxZjIwIi8+PC9nPjxwYXRoIGQ9Ik02LjM2LDcuNzlhMS40MywxLjQzLDAsMCwxLTEtLjQyTDEuNDIsMy40NWExLjQ0LDEuNDQsMCwwLDEsMC0yYzAuNTYtLjU2LDkuMzEtMC41Niw5Ljg3LDBhMS40NCwxLjQ0LDAsMCwxLDAsMkw3LjM3LDcuMzdBMS40MywxLjQzLDAsMCwxLDYuMzYsNy43OVoiIGZpbGw9IiNmZmYiLz48L3N2Zz4="
  ]
];

Blockly.utils.CODE_HASH = {
  "[motion_movesteps, motion_movegrids,motion_turnright,motion_turnleft,motion_gotoxy,motion_glideto,motion_sety,motion_changeyby,motion_setx,motion_changexby,motion_pointindirection,motion_glidesecstoxy,looks_goforwardbackwardlayers,looks_seteffectto,looks_changeeffectby,looks_setsizeto,looks_changesizeby,sound_setvolumeto,sound_changevolumeby,sound_seteffectto,sound_changeeffectby,data_listcontainsitem,data_itemnumoflist,data_itemoflist,data_replaceitemoflist,data_insertatlist,data_deleteoflist,data_addtolist,operator_mathop,operator_round,operator_mod,operator_equals,operator_lt,operator_gt,operator_random,operator_divide,operator_multiply,operator_subtract,operator_add,askandwait,event_whengreaterthan]": "[operator_add,operator_subtract,operator_multiply,operator_divide,operator_random,data_variable,data_listcontents,data_itemoflist,data_itemnumoflist,data_lengthoflist,operator_mod,operator_round,operator_mathop,operator_length,xposition,yposition,direction,costumenumbername,backdropnumbername,size,volume,sensing_distanceto,sensing_mousex,sensing_mousey,loudness,timer,of,current,sensing_dayssince2000,sensing_username,operator_join,operator_letter_of]",
  "[looks_think,looks_thinkforsecs,looks_say,looks_sayforsecs,looks_switchbackdropto,switchcostumeto,askandwait,operator_join,operator_letter_of,operator_length,operator_contains]": "[operator_join,operator_letter_of,operator_length,answer,data_variable,data_listcontents,data_itemoflist,data_itemnumoflist,data_lengthoflist,operator_add,operator_subtract,operator_multiply,operator_divide,operator_random,xposition,yposition,direction,costumenumbername,backdropnumbername,size,volume,sensing_distanceto,sensing_mousex,sensing_mousey,loudness,timer,of,current,sensing_dayssince2000,sensing_username]",
  "[control_if,control_if_else,wait_until,repeat_until]": "[operator_gt,operator_lt,operator_equals,operator_and,operator_or,operator_not,operator_contains,data_listcontainsitem,sensing_touchingobject,sensing_touchingcolor,sensing_coloristouchingcolor,sensing_keypressed,sensing_mousedown]",
  "[event_whenflagclicked,event_whenbroadcastreceived,event_whenkeypressed,event_whenthisspriteclicked,event_whenbackdropswitchesto,event_whengreaterthan,]": "[data_setvariableto,data_changevariableby,looks_show,looks_hide,motion_gotoxy,motion_goto,control_forever,control_repeat,repeat_until,control_if,control_if_else,control_wait,data_deletealloflist]",
  "[control_forever]": "[control_if,control_if_else]",
  "[data_setvariableto,data_changevariableby,control_wait,control_repeat]": "[data_setvariableto,data_changevariableby,control_forever,control_repeat,repeat_until,control_if,control_if_else,control_wait,operator_add,operator_subtract,operator_multiply,operator_divide,operator_random,data_variable,data_listcontents,data_itemoflist,data_itemnumoflist,data_lengthoflist,operator_mod,operator_round,operator_mathop,operator_length,xposition,yposition,direction,costumenumbername,backdropnumbername,size,volume,sensing_distanceto,sensing_mousex,sensing_mousey,loudness,timer,of,current,sensing_dayssince2000,sensing_username,operator_join,operator_letter_of]",
  "[operator_or,operator_and,operator_not]": "[sensing_touchingobject,sensing_touchingcolor,sensing_coloristouchingcolor,sensing_keypressed,sensing_mousedown,operator_gt,operator_lt,operator_equals,operator_and,operator_or,operator_not]"
};

Blockly.utils.CACHED_BLOCK_SVG_DATA = Object.create(null);

/**
 * Render block.
 * @param {Blockly.Block} block Block to be converted into SVG.
 * @param {string=} blockId Unique identifier of BlockSvg, which is used during caching.
 * @return {object} Block' svg image.
 */
Blockly.utils.getBlockSvgImage = function(
    { svgGroup_: svgGroup, type },
    blockId
) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const PATH_D_LENGTH_KEY_HASH = {
    // E shape
    122: [41, 81],
    108: [41, 67],
    94: [41, 67],
    // C shape
    82: [41],
    68: [41],
    54: [41],
  };
  /**
 * Opcode for type C or E blocks that require special handling.
 */
  const SPECIAL_BLOCK = [
    "control_repeat",
    "control_forever",
    "control_if",
    "control_if_else",
    "control_repeat_until",
  ];
  const ADDONS_BLOCK_SCALE = 3 / 4;
  if (Blockly.utils.CACHED_BLOCK_SVG_DATA[blockId]) {
    return Blockly.utils.CACHED_BLOCK_SVG_DATA[blockId];
  }
  if (!svgGroup) {
    return { url: '', height: 0, width: 0 };
  }
  if (svgGroup.style.display == 'none') {
    svgGroup.style.display = '';
    requestAnimationFrame(() => svgGroup.style.display = 'none');
  }
  const svgContent = svgGroup.outerHTML.replace(/&nbsp;/g, " ");
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("xmlns:html", "http://www.w3.org/1999/xhtml");
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("version", "1.1");
  svg.innerHTML = `
    <style type="text/css" >
      .blocklyDraggable {font-family: "Helvetica Neue", Helvetica, sans-serif;font-size: 12pt;font-weight: 500;}
      .blocklyText {fill: #fff;box-sizing: border-box;}
      .blocklyEditableText .blocklyText{fill: #000;}
      .blocklyDropdownText.blocklyText{fill: #fff;}
    </style>
  `;

  const container = document.createElementNS(SVG_NS, "g");
  container.innerHTML = svgContent;
  const rootNode = container.children[0];
  rootNode.style.display = "";
  let isChanged = false;
  let reducedDistance = 0;
  if (isChanged && SPECIAL_BLOCK.includes(type)) {
    const path = rootNode.children[0];
    let lastNodeReducedDistance = 0;
    const pathArr = path.getAttribute("d").split(",");
    const points = PATH_D_LENGTH_KEY_HASH[pathArr.length];
    if (points) {
      points.forEach((point) => {
        const distance = Number(pathArr[point].split(" ")[2]) - 16;
        reducedDistance += distance;
        pathArr[point] = "4 v 16 a 4";
        if (point === 41) {
          lastNodeReducedDistance = distance;
        }
      });
      path.setAttribute("d", pathArr.toString());
    }
    if (lastNodeReducedDistance && type !== "control_if") {
      const node = [...rootNode.children]
          .reverse()
          .find((i) => i.nodeName === "text");
      const translate = node
          .getAttribute("transform")
          .match(/\d+\.?\d*/g);
      translate[1] = translate[1] - lastNodeReducedDistance;
      node.setAttribute("transform", `translate(${translate.toString()}) `);
    }
  }
  rootNode.setAttribute("transform", "");
  const dataShape = rootNode.getAttribute("data-shapes");
  const hasHat = dataShape.includes("hat");
  const hasFunc = dataShape !== "hat" && hasHat;
  const box = (svgGroup.children[0]).getBBox();
  let offset = hasHat ? 18 : 0;
  offset = hasFunc ? 21 : offset;
  const width = box.width + 1;
  const height = box.height - reducedDistance;
  svg.appendChild(container);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute(
      "viewBox",
      ""
          .concat("-1", " ")
          .concat(hasHat ? `${-offset}` : "0", " ")
          .concat(String(width), " ")
          .concat(String(height))
  );
  let svgData = svg.outerHTML;
  // resolve image path
  Blockly.utils.BLOCKS_ICONS.forEach(([key, value]) => {
    svgData = svgData.replace(key, `"${value}"`);
  });

  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });

  // Ensure a maximum cache of 1000 to avoid excessive memory usage and lagging.
  const cachedBlockSvgs = Object.keys(Blockly.utils.CACHED_BLOCK_SVG_DATA);
  if (cachedBlockSvgs.length > 1000) {
    cachedBlockSvgs.slice(0, 100).forEach(key => delete Blockly.utils.CACHED_BLOCK_SVG_DATA[key]);
  }

  const result = {
    url: URL.createObjectURL(svgBlob),
    height: height * ADDONS_BLOCK_SCALE,
    width: width * ADDONS_BLOCK_SCALE,
  };

  // The procedures_call type block does not undergo caching.
  if (type !== "procedures_call") {
    Blockly.utils.CACHED_BLOCK_SVG_DATA[blockId] = result;
  }

  return result;
};

Blockly.utils.getBlockDesc = function(block, doms) {
  let desc = "";
  const process = ({ inputList }) => {
    for (const input of inputList) {
      const fields = input.fieldRow;
      for (const field of fields) {
        const text = field.getText();
        desc = (desc ? `${desc} ` : "") + text;
      }
      if (input.connection) {
        const innerBlock = input.connection.targetBlock();
        if (innerBlock) {
          process(innerBlock); // Recursive process connected child blocks...
        }
      }
    }
  };
  process(block);
  return {
    desc: desc,
    block: block,
    dom: doms[block.id]
  };
};

Blockly.utils.moveBatchedElements = function(delta, batchedElements) {
  batchedElements[0].forEach(moveBl => {
    moveBl.getSvgRoot().style.display = 'block';
    let setCommentStyleBlock = moveBl;
    do {
      if (setCommentStyleBlock.comment) {
        setCommentStyleBlock.comment.bubble_.bubbleGroup_.setAttribute(
            "style",
            "display: block"
        );
      }
      setCommentStyleBlock =
        ((setCommentStyleBlock.nextConnection || {}).targetConnection || {})
            .sourceBlock_;
    } while (
      setCommentStyleBlock
    );
    const old = moveBl.getRelativeToSurfaceXY();
    let newLoc = goog.math.Coordinate.sum(moveBl.getRelativeToSurfaceXY(), delta);
    moveBl.moveDuringDrag(newLoc, true);
    let event = new Blockly.Events.BlockMove(moveBl);
    event.oldCoordinate = old;
    event.recordNew();
    moveBl.moveConnections_(delta.x, delta.y);
    Blockly.Events.fire(event);
    // MoveConnections_ should be executed after the fire event is triggered.
    // Because he calculated it based on the actual block location
  });
  batchedElements[1].forEach(frame => {
    frame.getSvgRoot().style.display = "block";
    frame.moveBy(delta.x, delta.y);
  });
};

// Export symbols that would otherwise be renamed by Closure compiler.
if (!goog.global['Blockly']) {
  goog.global['Blockly'] = {};
}
if (!goog.global['Blockly']['Utils']) {
  goog.global['Blockly']['Utils'] = {};
}
goog.global['Blockly']['Utils']['genUid'] = Blockly.utils.genUid;
goog.global['Blockly']['Utils']['getBlockDesc'] = Blockly.utils.getBlockDesc;
goog.global['Blockly']['Utils']['getBlockSvgImage'] = Blockly.utils.getBlockSvgImage;
goog.global['Blockly']['Utils']['tokenizeInterpolation'] = Blockly.utils.tokenizeInterpolation;
goog.global['Blockly']['Utils']['getMouseVectorPosition'] = Blockly.utils.getMouseVectorPosition;
