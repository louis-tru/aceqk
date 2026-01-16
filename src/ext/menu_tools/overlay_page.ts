/**
 * ## Overlay Page utility
 *
 * Provides modal overlay functionality for displaying editor extension interfaces. Creates a full-screen overlay with
 * configurable backdrop behavior, keyboard navigation (ESC to close), and focus management. Used by various extensions
 * to display menus, settings panels, and other interactive content over the editor interface.
 *
 * **Usage:**
 * ```javascript
 * var overlayPage = require('./overlay_page').overlayPage;
 * var contentElement = document.createElement('div');
 * contentElement.innerHTML = '<h1>Settings</h1>';
 *
 * var overlay = overlayPage(editor, contentElement, function() {
 *   console.log('Overlay closed');
 * });
 * ```
 *
 * @module
 */


/*jslint indent: 4, maxerr: 50, white: true, browser: true, vars: true*/
/*global define, require */

'use strict';
import "./settings_menu.css";
import type {Editor} from "../../editor";
import {View,Box} from "quark";
import type {KeyEvent} from "quark/event";

/**
 * Generates an overlay for displaying menus. The overlay is an absolutely
 *  positioned div.
 * @author <a href="mailto:matthewkastor@gmail.com">
 *  Matthew Christopher Kastor-Inare III </a><br />
 *  ☭ Hial Atropa!! ☭
 * @param {Editor} editor
 * @param {View} contentElement Any element which may be presented inside
 *  a div.
 * @param {() => void} [callback]
 */
export function overlayPage(editor: Editor, contentElement: View, callback?: () => void) {
	// var closer = document.createElement('div');
	var closer = new Box(editor.window);
	var ignoreFocusOut = false;

	function documentEscListener(e: KeyEvent) {
		if (e.keyCode === 27) {
			close();
		}
	}

	function close() {
		if (!closer)
			return;
		// document.removeEventListener('keydown', documentEscListener);
		editor.window.root.removeEventListener('KeyDown', documentEscListener);
		closer.remove();
		if (editor) {
			editor.focus();
		}
		// @ts-ignore
		closer = null;
		callback && callback();
	}

	/**
	 * Defines whether overlay is closed when user clicks outside of it.
	 * 
	 * @param {Boolean} ignore      If set to true overlay stays open when focus moves to another part of the editor.
	 */
	function setIgnoreFocusOut(ignore: boolean) {
		ignoreFocusOut = ignore;
		if (ignore) {
			closer.style.receive = false;
			contentElement.style.receive = true;
		}
	}

	closer.style = {
		margin: 0,
		padding: 0,
		// position: "fixed",
		// top: 0,
		// bottom: 0,
		// left: 0,
		// right: 0,
		zIndex: 9990,
		backgroundColor: "rgba(0, 0, 0, 0.3)",
	};

	closer.addEventListener('Click', function(e) {
		if (!ignoreFocusOut) {
			close();
		}
	});
	// click closer if esc key is pressed
	editor.window.root.addEventListener('KeyDown', documentEscListener);

	contentElement.addEventListener('Click', function (e) {
		e.stopPropagation();
	});

	closer.append(contentElement);
	editor.window.root.append(closer);
	if (editor) {
		editor.blur();
	}
	return {
		close: close,
		setIgnoreFocusOut: setIgnoreFocusOut
	};
};
