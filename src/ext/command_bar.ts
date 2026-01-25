/**
 * ## Command Bar extension.
 *
 * Provides an interactive command bar tooltip that displays above the editor's active line. The extension enables
 * clickable commands with keyboard shortcuts, icons, and various button types including standard buttons, checkboxes,
 * and text elements. Supports overflow handling with a secondary tooltip for additional commands when space is limited.
 * The tooltip can be configured to always show or display only on mouse hover over the active line.
 *
 * @module
 */

import {Tooltip} from "../tooltip";
import {EventEmitter} from "../lib/event_emitter";
import * as lang from "../lib/lang";
import * as dom from "../lib/dom";
import * as useragent from "../lib/env";
import type { Point } from "../range";
import type {View,Box,Text} from "quark";
import type { Editor } from "../editor";
import type {Command} from "../keyboard/hash_handler";
import type { ClickEvent, UIEvent, MouseEvent as UIMouseEvent } from "quark/event";
import type {EditSession} from "../edit_session";
import type { MouseEvent } from "../mouse/mouse_event";

export const BUTTON_CLASS_NAME = 'command_bar_tooltip_button';
const VALUE_CLASS_NAME = 'command_bar_button_value';
const CAPTION_CLASS_NAME = 'command_bar_button_caption';
const KEYBINDING_CLASS_NAME = 'command_bar_keybinding';
const TOOLTIP_CLASS_NAME = 'command_bar_tooltip';
const MORE_OPTIONS_BUTTON_ID = 'MoreOptionsButton';

const defaultDelay = 100;
const defaultMaxElements = 4;

function minPosition(posA: Point, posB: Point): Point {
	if (posB.row > posA.row) {
		return posA;
	} else if (posB.row === posA.row && posB.column > posA.column) {
		return posA;
	}
	return posB;
};

const keyDisplayMap = {
	"Ctrl": { mac: "^"},
	"Option": { mac: "⌥"},
	"Command": { mac: "⌘"},
	"Cmd": { mac: "⌘"},
	"Shift": "⇧",
	"Left": "←",
	"Right": "→",
	"Up": "↑",
	"Down": "↓"
};

export interface CommandBarOptions {
	maxElementsOnTooltip: number;
	alwaysShow: boolean;
	showDelay: number;
	hideDelay: number;
}

type TooltipCommandFunction<T> = (editor: Editor) => T;

export interface TooltipCommand extends Command {
	enabled?: TooltipCommandFunction<boolean> | boolean,
	getValue?: TooltipCommandFunction<any>,
	type: "button" | "text" | "checkbox"
	iconCssClass?: string,
	cssClass?: string
}

export interface CommandBarEvents {
	"hide": (e: undefined, emitter: CommandBarTooltip) => void;
	"show": (e: undefined, emitter: CommandBarTooltip) => void;
	"alwaysShow": (e: boolean, emitter: CommandBarTooltip) => void;
}

/**
 * Displays a command tooltip above the currently active line selection, with clickable elements.
 *
 * Internally it is a composite of two tooltips, one for the main tooltip and one for the 
 * overflowing commands.
 * The commands are added sequentially in registration order.
 * When attached to an editor, it is either always shown or only when the active line is hovered
 * with mouse, depending on the alwaysShow property.
 */
export class CommandBarTooltip extends EventEmitter<CommandBarEvents> {
	parentNode: View;
	tooltip: Tooltip;
	moreOptions: Tooltip;
	maxElementsOnTooltip: number;
	$alwaysShow: boolean;
	eventListeners: {[id: string]: (e: ClickEvent) => void};
	elements: {[id: string]: Box};
	commands: {[id: string]: TooltipCommand};
	tooltipEl: Box;
	moreOptionsEl: Box;
	$showTooltipTimer: lang.DelayedCall;
	$hideTooltipTimer: lang.DelayedCall;
	$mouseInTooltip: boolean;
	editor: Editor;
	$shouldHideMoreOptions?: boolean;

	/**
	 * @param {View} parentNode
	 * @param {Partial<CommandBarOptions>} [options]
	 */
	constructor(parentNode: View, options: Partial<CommandBarOptions> = {}) {
		super();
		this.parentNode = parentNode;
		this.tooltip = new Tooltip(this.parentNode);
		this.moreOptions = new Tooltip(this.parentNode);
		this.maxElementsOnTooltip = options.maxElementsOnTooltip || defaultMaxElements;
		this.$alwaysShow = options.alwaysShow || false;
		this.eventListeners = {};
		this.elements = {};
		this.commands = {};

		this.tooltipEl = dom.buildDom(['box', { class: TOOLTIP_CLASS_NAME }], this.tooltip.getElement());
		this.moreOptionsEl = dom.buildDom(['box', { class: TOOLTIP_CLASS_NAME + " tooltip_more_options" }], this.moreOptions.getElement());

		this.$showTooltipTimer = lang.delayedCall(this.$showTooltip.bind(this), options.showDelay || defaultDelay);
		this.$hideTooltipTimer = lang.delayedCall(this.$hideTooltip.bind(this), options.hideDelay || defaultDelay);
		this.$tooltipEnter = this.$tooltipEnter.bind(this);
		this.$onMouseMove = this.$onMouseMove.bind(this);
		this.$onChangeScroll = this.$onChangeScroll.bind(this);
		this.$onEditorChangeSession = this.$onEditorChangeSession.bind(this);
		this.$scheduleTooltipForHide = this.$scheduleTooltipForHide.bind(this);
		this.$preventMouseEvent = this.$preventMouseEvent.bind(this);

		for (var event of ["MouseDown", "MouseUp", "Click"]) {
			this.tooltip.getElement().addEventListener(event, this.$preventMouseEvent);
			this.moreOptions.getElement().addEventListener(event, this.$preventMouseEvent);
		}
	}

	/**
	 * Registers a command on the command bar tooltip.
	 * 
	 * The commands are added in sequential order. If there is not enough space on the main
	 * toolbar, the remaining elements are added to the overflow menu.
	 * 
	 * @param {string} id
	 * @param {TooltipCommand} command
	 */
	registerCommand(id: string, command: TooltipCommand) {
		var registerForMainTooltip = Object.keys(this.commands).length < this.maxElementsOnTooltip;
		if (!registerForMainTooltip && !this.elements[MORE_OPTIONS_BUTTON_ID]) {
			this.$createCommand(MORE_OPTIONS_BUTTON_ID, {
				name: "···",
				exec: 
				/**
				 * @this {CommandBarTooltip}
				 */
				()=>{
					this.$shouldHideMoreOptions = false;
					this.$setMoreOptionsVisibility(!this.isMoreOptionsShown());
				},
				type: "checkbox",
				getValue:() => {
					return this.isMoreOptionsShown();
				},
				enabled: true
			}, true);
		}
		this.$createCommand(id, command, registerForMainTooltip);
		if (this.isShown()) {
			this.updatePosition();
		}
	}

	isShown() {
		return !!this.tooltip && this.tooltip.isOpen;
	}

	isMoreOptionsShown() {
		return !!this.moreOptions && this.moreOptions.isOpen;
	}

	getAlwaysShow() {
		return this.$alwaysShow;
	}

	/**
	 * Sets the display mode of the tooltip
	 * 
	 * When true, the tooltip is always displayed while it is attached to an editor.
	 * When false, the tooltip is displayed only when the mouse hovers over the active editor line.
	 * 
	 * @param {boolean} alwaysShow
	 */
	setAlwaysShow(alwaysShow: boolean) {
		this.$alwaysShow = alwaysShow;
		this.$updateOnHoverHandlers(!this.$alwaysShow);
		this._signal("alwaysShow", this.$alwaysShow, this);
	}

	/**
	 * Attaches the clickable command bar tooltip to an editor
	 * 
	 * Depending on the alwaysShow parameter it either displays the tooltip immediately,
	 * or subscribes to the necessary events to display the tooltip on hover.
	 * 
	 * @param {Editor} editor
	 */
	attach(editor: Editor) {
		if (!editor || (this.isShown() && this.editor === editor)) {
			return;
		}

		this.detach();

		this.editor = editor;
		this.editor.on("changeSession", this.$onEditorChangeSession);
		if (this.editor.session) {
			this.editor.session.on("changeScrollLeft", this.$onChangeScroll);
			this.editor.session.on("changeScrollTop", this.$onChangeScroll);
		}

		if (this.getAlwaysShow()) {
			this.$showTooltip();
		} else {
			this.$updateOnHoverHandlers(true);
		}
	}

	/**
	 * Updates the position of the command bar tooltip. It aligns itself above the active line in the editor.
	 */
	updatePosition() {
		if (!this.editor) {
			return;
		}
		var renderer = this.editor.renderer;

		var ranges;
		if (this.editor.selection.getAllRanges) {
			ranges = this.editor.selection.getAllRanges();
		} else {
			ranges = [this.editor.getSelectionRange()];
		}
		if (!ranges.length) {
			return;
		}
		var minPos = minPosition(ranges[0].start, ranges[0].end);
		for (var i = 0, range; range = ranges[i]; i++) {
			minPos = minPosition(minPos, minPosition(range.start, range.end));
		}

		var pos = renderer.$cursorLayer.getPixelPosition(minPos, true);

		var tooltipEl = this.tooltip.getElement();
		var wsize = tooltipEl.window.size;
		var screenWidth = wsize.width;
		var screenHeight = wsize.height;
		var posi = this.editor.container.position;
		var size = this.editor.container.clientSize;
		var rect = {
			top: posi.y,
			left: posi.x,
			bottom: posi.y + size.height,
			right: posi.x + size.width
		};

		pos.top += rect.top - renderer.layerConfig.offset;
		pos.left += rect.left + renderer.gutterWidth - renderer.scrollLeft;

		var cursorVisible = pos.top >= rect.top && pos.top <= rect.bottom &&
			pos.left >= rect.left + renderer.gutterWidth && pos.left <= rect.right;

		if (!cursorVisible && this.isShown()) {
			this.$hideTooltip();
			return;
		} else if (cursorVisible && !this.isShown() && this.getAlwaysShow()) {
			this.$showTooltip();
			return;
		}

		var clSize = tooltipEl.clientSize;
		var top = pos.top - clSize.height;
		var left = Math.min(screenWidth - clSize.width, pos.left);

		var tooltipFits = top >= 0 && top + clSize.height <= screenHeight &&
			left >= 0 && left + clSize.width <= screenWidth;

		if (!tooltipFits) {
			this.$hideTooltip();
			return;
		}

		this.tooltip.setPosition(left, top);

		if (this.isMoreOptionsShown()) {
			top = top + clSize.height;
			left = this.elements[MORE_OPTIONS_BUTTON_ID].position.x;
	
			var moreOptionsEl = this.moreOptions.getElement();
			var moreOptionsSize = moreOptionsEl.clientSize;
			var screenHeight = wsize.height;
			if (top + moreOptionsSize.height > screenHeight) {
				top -= clSize.height + moreOptionsSize.height;
			}
			if (left + moreOptionsSize.width > screenWidth) {
				left = screenWidth - moreOptionsSize.width;
			}

			this.moreOptions.setPosition(left, top);
		}
	}

	/**
	 * Updates each command element in the tooltip. 
	 * 
	 * This is automatically called on certain events, but can be called manually as well.
	 */
	update() {
		Object.keys(this.elements).forEach(this.$updateElement.bind(this));
	}

	/**
	 * Detaches the tooltip from the editor.
	 */
	detach() {
		this.tooltip.hide();
		this.moreOptions.hide();
		this.$updateOnHoverHandlers(false);
		if (this.editor) {
			this.editor.off("changeSession", this.$onEditorChangeSession);
			if (this.editor.session) {
				this.editor.session.off("changeScrollLeft", this.$onChangeScroll);
				this.editor.session.off("changeScrollTop", this.$onChangeScroll);
			}
		}
		this.$mouseInTooltip = false;
		(this as any).editor = null;
	}

	destroy() {
		if (this.tooltip && this.moreOptions) {
			this.detach();
			this.tooltip.destroy();
			this.moreOptions.destroy();
		}
		this.eventListeners = {};
		this.commands = {};
		this.elements = {};
		var self = this as any;
		self.tooltip = self.moreOptions = self.parentNode = null; // help GC
	}

	/**
	 * @param {string} id
	 * @param {TooltipCommand} command
	 * @param {boolean} forMainTooltip
	 */
	$createCommand(id: string, command: TooltipCommand, forMainTooltip: boolean) {
		var parentEl = forMainTooltip ? this.tooltipEl : this.moreOptionsEl;
		var keyParts: string[] = [];
		var bindKey = command.bindKey;
		if (bindKey) {
			if (typeof bindKey === 'object') {
				bindKey = useragent.isMac ? bindKey.mac! : bindKey.win!;
			}
			bindKey = bindKey.split("|")[0];
			keyParts = bindKey.split("-");

			keyParts = keyParts.map(function(key) {
				const k = key as keyof typeof keyDisplayMap;
				if (keyDisplayMap[k]) {
					if (typeof keyDisplayMap[k] === 'string') {
						return keyDisplayMap[k];
					} else if (useragent.isMac && keyDisplayMap[k].mac) {
						return keyDisplayMap[k].mac;
					}
				}
				return key;
			});
		}

		/**@type {any[]} */
		var buttonNode: dom.BuildDomArr;
		if (forMainTooltip && command.iconCssClass) {
			//Only support icon button for main tooltip, otherwise fall back to text button
			buttonNode = [
				'box',
				{
					class: ["ace_icon_svg", command.iconCssClass].join(" "),
					"aria-label": command.name + " (" + command.bindKey + ")"
				}
			];
		} else {
			buttonNode = [
				['box', { class: VALUE_CLASS_NAME }],
				['box', { class: CAPTION_CLASS_NAME}, command.name]
			];
			if (keyParts.length) {
				buttonNode.push(
					[
						'box',
						{ class: KEYBINDING_CLASS_NAME },
						keyParts.map(function(keyPart) {
							return ['box', keyPart];
						}) as any
					]
				);
			}
		}

		dom.buildDom(['box', { class: [BUTTON_CLASS_NAME, command.cssClass || ""], ref: id }, buttonNode], parentEl, this.elements);
		this.commands[id] = command;
		
		var eventListener =
			/**
			 * @this {CommandBarTooltip}
			 */
		(e: ClickEvent) => {
			if (this.editor) {
				this.editor.focus();
			}
			// Internal variable to properly handle when the more options button is clicked
			this.$shouldHideMoreOptions = this.isMoreOptionsShown();
			if (!this.elements[id].getAttribute("disabled") && command.exec) {
				command.exec(this.editor);
			}
			if (this.$shouldHideMoreOptions) {
				this.$setMoreOptionsVisibility(false);
			}
			this.update();
			e.preventDefault();
		};
		this.eventListeners[id] = eventListener;
		this.elements[id].addEventListener('Click', eventListener.bind(this));
		this.$updateElement(id);
	}

	/**
	 * @param {boolean} visible
	 */
	$setMoreOptionsVisibility(visible: boolean) {
		if (visible) {
			this.moreOptions.setTheme(this.editor.renderer.theme);
			this.moreOptions.setClassName(TOOLTIP_CLASS_NAME + "_wrapper");
			this.moreOptions.show();
			this.update();
			this.updatePosition();
		} else {
			this.moreOptions.hide();
		}
	}

	$onEditorChangeSession(e: { oldSession: EditSession, session: EditSession }) {
		if (e.oldSession) {
			e.oldSession.off("changeScrollTop", this.$onChangeScroll);
			e.oldSession.off("changeScrollLeft", this.$onChangeScroll);
		}
		this.detach();
	}

	$onChangeScroll() {
		if (this.editor.renderer && (this.isShown() || this.getAlwaysShow())) {
			this.editor.renderer.once("afterRender", this.updatePosition.bind(this));
		}
	}

	$onMouseMove(e: UIMouseEvent | MouseEvent) {
		if (this.$mouseInTooltip) {
			return;
		}
		var cursorPosition = this.editor.getCursorPosition();
		var cursorScreenPosition = this.editor.renderer.textToScreenCoordinates(cursorPosition.row, cursorPosition.column);
		var lineHeight = this.editor.renderer.lineHeight;
		
		var isInCurrentLine = e.position.y >= cursorScreenPosition.pageY && e.position.y < cursorScreenPosition.pageY + lineHeight;

		if (isInCurrentLine) {
			if (!this.isShown() && !this.$showTooltipTimer.isPending()) {
				this.$showTooltipTimer.delay();
			}
			if (this.$hideTooltipTimer.isPending()) {
				this.$hideTooltipTimer.cancel();
			}
		} else {
			if (this.isShown() && !this.$hideTooltipTimer.isPending()) {
				this.$hideTooltipTimer.delay();
			}
			if (this.$showTooltipTimer.isPending()) {
				this.$showTooltipTimer.cancel();
			}
		}
	}

	$preventMouseEvent(e: UIEvent) {
		if (this.editor) {
			this.editor.focus();
		}
		e.preventDefault();
	}
	
	$scheduleTooltipForHide() {
		this.$mouseInTooltip = false;
		this.$showTooltipTimer.cancel();
		this.$hideTooltipTimer.delay();
	}

	$tooltipEnter() {
		this.$mouseInTooltip = true;
		if (this.$showTooltipTimer.isPending()) {
			this.$showTooltipTimer.cancel();
		}
		if (this.$hideTooltipTimer.isPending()) {
			this.$hideTooltipTimer.cancel();
		}
	}

	/**
	 * @param {boolean} [enableHover]
	 */
	$updateOnHoverHandlers(enableHover?: boolean) {
		var tooltipEl = this.tooltip.getElement();
		var moreOptionsEl = this.moreOptions.getElement();
		if (enableHover) {
			if (this.editor) {
				this.editor.on("mousemove", this.$onMouseMove);
				this.editor.renderer.getMouseEventTarget().addEventListener("MouseLeave", this.$scheduleTooltipForHide);
			}
			tooltipEl.addEventListener('mouseenter', this.$tooltipEnter);
			tooltipEl.addEventListener('mouseleave', this.$scheduleTooltipForHide);
			moreOptionsEl.addEventListener('mouseenter', this.$tooltipEnter);
			moreOptionsEl.addEventListener('mouseleave', this.$scheduleTooltipForHide);
		} else {
			if (this.editor) {
				this.editor.off("mousemove", this.$onMouseMove);
				this.editor.renderer.getMouseEventTarget().removeEventListener("MouseLeave", this.$scheduleTooltipForHide);
			}
			tooltipEl.removeEventListener('mouseenter', this.$tooltipEnter);
			tooltipEl.removeEventListener('mouseleave', this.$scheduleTooltipForHide);
			moreOptionsEl.removeEventListener('mouseenter', this.$tooltipEnter);
			moreOptionsEl.removeEventListener('mouseleave', this.$scheduleTooltipForHide);
		}
	}

	$showTooltip() {
		if (this.isShown()) {
			return;
		}
		this.tooltip.setTheme(this.editor.renderer.theme);
		this.tooltip.setClassName(TOOLTIP_CLASS_NAME + "_wrapper");
		this.tooltip.show();
		this.update();
		this.updatePosition();
		this._signal("show", void 0, this);
	}
	$hideTooltip() {
		this.$mouseInTooltip = false;
		if (!this.isShown()) {
			return;
		}
		this.moreOptions.hide();
		this.tooltip.hide();
		this._signal("hide", void 0, this);
	}

	/**
	 * @param {string} id
	 */
	$updateElement(id: string) {
		var command = this.commands[id];
		if (!command) {
			return;
		}
		var el = this.elements[id];
		var commandEnabled = command.enabled;
		
		if (typeof commandEnabled === 'function') {
			commandEnabled = commandEnabled(this.editor);
		}

		if (typeof command.getValue === 'function') {
			var value = command.getValue(this.editor);
			if (command.type === 'text') {
				el.removeAllChild();
				dom.buildDom(['label', { value }], el);
				// el.value = value;
			} else if (command.type === 'checkbox') {
				var domCssFn = value ? dom.addCssClass : dom.removeCssClass;
				var isOnTooltip = el.parent === this.tooltipEl;
				el.setAttribute("ariaChecked", value);
				if (isOnTooltip) {
					domCssFn(el, "ace_selected");
				} else {
					el = el.querySelectorForClass("." + VALUE_CLASS_NAME) as Text;
					domCssFn(el, "ace_checkmark");
				}
			}
		}

		if (commandEnabled && el.getAttribute("disabled")) {
			dom.removeCssClass(el, "ace_disabled");
			el.setAttribute("ariaDisabled", false);
			el.setAttribute("disabled", false);
			el.removeAttribute("disabled");
		} else if (!commandEnabled && !el.getAttribute("disabled")) {
			dom.addCssClass(el, "ace_disabled");
			el.setAttribute("ariaDisabled", true);
			el.setAttribute("disabled", true);
		}
	}
}

dom.importCss({
[`.ace_tooltip.${TOOLTIP_CLASS_NAME}_wrapper`]: {
	padding: 0
},

[`.ace_tooltip .${TOOLTIP_CLASS_NAME}`]: {
	padding: [1, 5],
	// display: flex;
	receive: true,
},

[`.ace_tooltip .${TOOLTIP_CLASS_NAME}.tooltip_more_options`]: {
	padding: 1,
	direction: 'column',
},

// `div.${BUTTON_CLASS_NAME}`: {
[`.${BUTTON_CLASS_NAME}`]: {
	// display: inline-flex;
	cursor: 'pointer',
	margin: 1,
	borderRadius: 2,
	padding: [2, 5],
	itemsAlign: 'center',
},

// div.${BUTTON_CLASS_NAME}.ace_selected,div.${BUTTON_CLASS_NAME}:hover:not(.ace_disabled)
[`.${BUTTON_CLASS_NAME}.ace_selected,.${BUTTON_CLASS_NAME}:hover`]:{
	backgroundColor: 'rgba(0, 0, 0, 0.1)',
},

[`.${BUTTON_CLASS_NAME}.ace_disabled`]: {
	textColor: '#777',
	receive: false,
},

[`.${BUTTON_CLASS_NAME} .ace_icon_svg`]: {
	height: 12,
	backgroundColor: '#000',
},

[`.${BUTTON_CLASS_NAME}.ace_disabled .ace_icon_svg`]: {
	backgroundColor: '#777',
},

[`.${TOOLTIP_CLASS_NAME}.tooltip_more_options .${BUTTON_CLASS_NAME}`]: {
	// display: flex;
},

[`.${TOOLTIP_CLASS_NAME}.${VALUE_CLASS_NAME}`]: {
	visible: false,
},

[`.${TOOLTIP_CLASS_NAME}.tooltip_more_options .${VALUE_CLASS_NAME}`]: {
	// display: inline-block,
	width: 12,
},

[`.${CAPTION_CLASS_NAME}`]: {
	// display: inline-block;
},

[`.${KEYBINDING_CLASS_NAME}`]: {
	margin: [0, 2],
	// display: inline-block;
	fontSize: 8,
},

[`.${TOOLTIP_CLASS_NAME}.tooltip_more_options .${KEYBINDING_CLASS_NAME}`]: {
	// margin-left: auto;
	align: 'end', // right align
},

[`.${KEYBINDING_CLASS_NAME} .div`]: {
	// display: inline-block;
	minWidth: 8,
	padding: 2,
	margin: [0, 1],
	borderRadius: 2,
	backgroundColor: '#ccc',
	textAlign: 'center',
},

[`.ace_dark.ace_tooltip .${TOOLTIP_CLASS_NAME}`]: {
	backgroundColor: '#373737',
	textColor: '#eee',
},

[`.ace_dark .${BUTTON_CLASS_NAME}.ace_disabled`]: {
	textColor: '#979797',
},

// .ace_dark div.${BUTTON_CLASS_NAME}.ace_selected,
// .ace_dark div.${BUTTON_CLASS_NAME}:hover:not(.ace_disabled) {
[`.ace_dark .${BUTTON_CLASS_NAME}.ace_selected,.ace_dark .${BUTTON_CLASS_NAME}:hover`]: {
	backgroundColor: 'rgba(255, 255, 255, 0.1)',
},

[`.ace_dark .${BUTTON_CLASS_NAME} .ace_icon_svg`]: {
	backgroundColor: '#eee',
},

[`.ace_dark .${BUTTON_CLASS_NAME}.ace_disabled .ace_icon_svg`]: {
	backgroundColor: '#979797',
},

[`.ace_dark .${KEYBINDING_CLASS_NAME} .div`]: {
	backgroundColor: '#575757',
},

// .ace_checkmark::before {
// 	content: '✓';
// }
}, "commandbar.css", false);
