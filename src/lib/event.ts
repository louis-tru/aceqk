
import keys,{$codeToKeyCode} from "./keys";
import type {KeyEvent, UIEvent,MouseEvent} from 'quark/event';
import type {View, Window} from 'quark';
import * as useragent from "./env";
import {Vec2} from "quark/types";

export function getModifierHash(e: KeyEvent) {
	return 0 | (e.ctrl ? 1 : 0) | (e.alt ? 2 : 0) | (e.shift ? 4 : 0) | (e.command ? 8 : 0);
}

export function getModifierString(e: KeyEvent) {
	return keys.KEY_MODS[getModifierHash(e)];
};

/*
* Prevents propagation and clobbers the default action of the passed event
*/
export function stopEvent(e: UIEvent) {
	e.cancelBubble();
	e.cancelDefault();
	return false;
};

export class EventListener {
	elem: View;
	type: UIEventType;
	callback: (e: UIEvent) => void;
	constructor(elem: View, type: UIEventType, callback: (e: UIEvent) => void) {
		this.elem = elem;
		this.type = type;
		this.callback = callback;
	}
	destroy() {
		removeListener(this.elem, this.type, this.callback as (e: UIEvent) => void);
		const self = this as any;
		self.elem = self.type = self.callback = undefined;
	}
}

export type UIEventType = 'Click' | 'MouseDown' | 'MouseUp' | 'MouseMove' | 'MouseLeave' | 'MouseEnter'
	| 'MouseWheel' | 'KeyDown' | 'KeyUp' | 'KeyPress' | 'Focus' | 'Blur' | 'Change' | 'Scroll' | 'Back'
	| 'KeyEnter' | 'TouchStart' | 'TouchEnd' | 'TouchMove' | 'TouchCancel' | 'UIStateChange' | 'ActionKeyframe'
	| 'ActionLoop' | 'Load' | 'Error' | 'MultiClick';

/**
 * Adds an event listener to the specified element.
 *
 * @param {View} elem - The element to add the event listener to.
 * @param {UIEventType} type - The type of event to listen for.
 * @param {(e: T) => void} callback - The callback function to be executed when the event is triggered.
 * @param {{ $toDestroy: EventListener[] }} [destroyer] - An optional object that will have the created EventListener instance added to its $toDestroy array, allowing it to be easily destroyed later.
 */
export function addListener<T extends UIEvent>(elem: View, type: UIEventType, callback: (e: T) => void, destroyer?: { $toDestroy: EventListener[] }) {
	elem.addEventListener(type, callback as (e: UIEvent) => void);
	if (destroyer)
		destroyer.$toDestroy.push(new EventListener(elem, type, callback as (e: UIEvent) => void));
};

export function removeListener<T extends UIEvent>(elem: View, type: UIEventType, callback: (e: T) => void) {
	elem.removeEventListener(type, callback as (e: UIEvent) => void);
};

export function preventDefault(e: UIEvent) {
	e.cancelDefault();
}

export function stopPropagation(e: UIEvent) {
	e.cancelBubble();
}

var pressedKeys: Record<string|number, number|boolean|null> | null = null;
var ts = 0;

/**
 * @param {(e: KeyEvent, hashId: number, keyCode: number)=> void } callback
 * @param {KeyEvent} e
 * @param {number} keyCode
 */
function normalizeCommandKeys(callback: (e: KeyEvent, hashId: number, keyCode: number)=> void, e: KeyEvent, keyCode: number) {
	var hashId = getModifierHash(e);

	if (!keyCode && e.code) {
		keyCode = $codeToKeyCode[e.code] || keyCode;
	}

	if (!useragent.macOS && pressedKeys) {
		if (e.command)
			hashId |= 8;
		if (pressedKeys.altGr) {
			if ((3 & hashId) != 3)
				pressedKeys.altGr = 0;
			else
				return;
		}
		if (keyCode === 18 || keyCode === 17) {
			var location = e.location;
			if (keyCode === 17 && location === 1) {
				if (pressedKeys[keyCode] == 1)
					ts = e.timestamp;
			} else if (keyCode === 18 && hashId === 3 && location === 2) {
				var dt = e.timestamp - ts;
				if (dt < 50)
					pressedKeys.altGr = true;
			}
		}
	}

	if (keyCode in keys.MODIFIER_KEYS) {
		keyCode = -1;
	}
	
	if (!hashId && keyCode === 13) {
		if (e.location === 3) {
			callback(e, hashId, -keyCode);
			if (!e.isDefault)
				return;
		}
	}

	if (/*useragent.isChromeOS &&*/ hashId & 8) {
		callback(e, hashId, keyCode);
		if (!e.isDefault)
			return; // default prevented
		else
			hashId &= ~8;
	}

	// If there is no hashId and the keyCode is not a function key, then
	// we don't call the callback as we don't handle a command key here
	// (it's a normal key/character input).
	if (!hashId && !(keyCode in keys.FUNCTION_KEYS) && !(keyCode in keys.PRINTABLE_KEYS)) {
		return false;
	}
	
	return callback(e, hashId, keyCode);
}

/**
 * @param {View} el
 * @param {(e: KeyEvent, hashId: number, keyCode: number)=>void} callback
 * @param [destroyer]
 */
export function addCommandKeyListener(
		el: View,
		callback: (e: KeyEvent, hashId: number, keyCode: number)=>void,
		destroyer?: { $toDestroy: EventListener[] }) 
{
	var lastDefaultPrevented: boolean | null = null;

	addListener(el, "KeyDown", function(e: KeyEvent) {
		pressedKeys![e.keycode] = (pressedKeys![e.keycode] || 0) as number + 1;
		var result = normalizeCommandKeys(callback, e, e.keycode);
		lastDefaultPrevented = !e.isDefault;
		return result;
	}, destroyer);

	addListener(el, "KeyPress", function(e: KeyEvent) {
		if (lastDefaultPrevented && (e.ctrl || e.alt || e.shift || e.command)) {
			stopEvent(e);
			lastDefaultPrevented = null;
		}
	}, destroyer);

	addListener(el, "KeyUp", function(e: KeyEvent) {
		pressedKeys![e.keycode] = null;
	}, destroyer);

	if (!pressedKeys) {
		resetPressedKeys();
		addListener(el.window.root, "Focus", resetPressedKeys);
	}
}

function resetPressedKeys() {
	pressedKeys = Object.create(null);
}

export type MultiClickEvent = 'mousedown' | 'dblclick' | 'tripleclick' | 'quadclick';

export function addMultiMouseDownListener(
	elements: View | View[],
	timeouts: number[],
	eventHandler: (
		e: MultiClickEvent,
		ev: MouseEvent & { _clicks?: number }
	) => void,
	destroyer?: { $toDestroy: EventListener[] }
) {
	let clicks = 0;
	let start: Vec2 = Vec2.zero();
	let lastTime = 0;

	let lastEmittedClicks = 0;
	const MAX_CLICKS = 4;
	const MOVE_THRESHOLD = 5; // px

	const eventNames: Record<number, 'dblclick' | 'tripleclick' | 'quadclick'> = {
		2: 'dblclick',
		3: 'tripleclick',
		4: 'quadclick',
	};

	function reset() {
		clicks = 0;
		lastEmittedClicks = 0;
		lastTime = 0;
	}

	function onMousedown(e: MouseEvent & { _clicks?: number }) {
		const now = e.timestamp;

		if (clicks === 0) {
			start = e.position;
			lastTime = now;
		} else {
			const timeDiff = now - lastTime;
			const timeout = timeouts[clicks - 1] ?? 600;

			const dx = Math.abs(e.position.x - start.x);
			const dy = Math.abs(e.position.y - start.y);

			if (timeDiff > timeout || dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
				reset();
				start = e.position;
				lastTime = now;
			} else {
				lastTime = now;
			}
		}

		clicks++;
		if (clicks > MAX_CLICKS) {
			reset();
			return;
		}

		e._clicks = clicks;

		// 永远触发 mousedown
		eventHandler('mousedown', e);

		// 只在“跃迁点”触发多击事件
		if (clicks > 1 && clicks > lastEmittedClicks) {
			const name = eventNames[clicks];
			if (name) {
				lastEmittedClicks = clicks;
				eventHandler(name, e);
			}
		}
	}

	if (!Array.isArray(elements))
		elements = [elements];

	elements.forEach(el => {
		addListener(el, 'MouseDown', onMousedown, destroyer);
	});
}

/**
 * @param el
 * @param callback
 * @param [destroyer]
 */
export function addMouseWheelListener(el: View, callback: (e: MouseEvent) => void, destroyer?: { $toDestroy: EventListener[] }) {
	addListener(el, "MouseWheel",  function(e: MouseEvent & {wheelX?: number, wheelY?: number}) {
		// var factor = 0.15;
		// workaround for firefox changing deltaMode based on which property is accessed first
		// var deltaX = e.deltaX || 0;
		// var deltaY = e.deltaY || 0;
		// switch (e.deltaMode) {
		// 	case e.DOM_DELTA_PIXEL:
		// 		e.wheelX = deltaX * factor;
		// 		e.wheelY = deltaY * factor;
		// 		break;
		// 	case e.DOM_DELTA_LINE:
		// 		var linePixels = 15;
		// 		e.wheelX = deltaX * linePixels;
		// 		e.wheelY = deltaY * linePixels;
		// 		break;
		// 	case e.DOM_DELTA_PAGE:
		// 		var pagePixels = 150;
		// 		e.wheelX = deltaX * pagePixels;
		// 		e.wheelY = deltaY * pagePixels;
		// 		break;
		// }
		callback(e); // Quark normalizes wheel delta to pixels
	}, destroyer);
};

/*
 * @return {Number} 0 for left button, 1 for middle button, 2 for right button
 */
export function getButton(e: KeyEvent): number {
	// if (e.type == "dblclick")
	// 	return 0;
	// if (e.type == "contextmenu" || (useragent.isMac && (e.ctrl && !e.alt && !e.shift)))
	// 	return 2;
	switch (e.keycode) {
		case keys.MOUSE_LEFT:
			return 0;
		case keys.MOUSE_CENTER:
			return 1;
		case keys.MOUSE_RIGHT:
			return 2;
		default:
			return -1;
	}
};

export function capture(el: View, eventHandler = (e: MouseEvent) => {}, releaseCaptureHandler?: (e: MouseEvent) => void) {
	if (!el) return;
	var ownerDocument = el && el.window.root;
	function onMouseUp(e: MouseEvent) {
		eventHandler && eventHandler(e);
		releaseCaptureHandler && releaseCaptureHandler(e);
		removeListener(ownerDocument, "MouseMove", eventHandler);
		removeListener(ownerDocument, "MouseUp", onMouseUp);
		// removeListener(ownerDocument, "DragStart", onMouseUp);
	}
	addListener(ownerDocument, "MouseMove", eventHandler);
	addListener(ownerDocument, "MouseUp", onMouseUp);
	// addListener(ownerDocument, "DragStart", onMouseUp);
	return onMouseUp;
};

export function nextFrame(callback: ()=>void, window: Window) {
	window.nextFrame(callback);
}