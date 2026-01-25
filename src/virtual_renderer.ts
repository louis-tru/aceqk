"use strict";

import util from 'quark/util';
import * as lang from "./lib/lang";
import config from "./config";
import {Gutter as GutterLayer} from "./layer/gutter";
import {Marker as MarkerLayer} from "./layer/marker";
import {Text as TextLayer} from "./layer/text";
import {Cursor as CursorLayer} from "./layer/cursor";
import {HScrollBar,VScrollBar} from "./scrollbar";
import {RenderLoop} from "./renderloop";
import {FontMetrics} from "./layer/font_metrics";
import {EventEmitter} from "./lib/event_emitter";
import type {LayerConfig} from "./layer/lines";
import type {Range,Point} from "./range";
import qk, {Window, Morph, Box, Text, Label, InputSink} from "quark";
import {isTextToken} from "./layer/text_util";
import type { OptionsProvider } from "./lib/app_config";
import { Vec2, CursorStyle, newRect } from "quark/types";
import type { LineWidget } from './line_widgets';
import type {Annotation} from "./layer/gutter";
import type { Theme } from './theme';
import type { EditSession } from './ace';
import './css/editor-css';

export type Composition = {
	markerRange: Range;
	markerId?: number;
}

export interface VirtualRendererEvents {
	"afterRender": (e: any, emitter: VirtualRenderer) => void;
	"beforeRender": (e: any, emitter: VirtualRenderer) => void;
	"themeLoaded": (e: { theme: string | Theme }, emitter: VirtualRenderer) => void;
	"themeChange": (e: { theme: string | Theme }, emitter: VirtualRenderer) => void;
	"scrollbarVisibilityChanged": (e: undefined, emitter: VirtualRenderer) => void;
	"changeCharacterSize": (e: any, emitter: VirtualRenderer) => void;
	"resize": (e: any, emitter: VirtualRenderer) => void;
	"autosize": (e: undefined, emitter: VirtualRenderer) => void;
}

export interface VirtualRendererOptions {
	animatedScroll: boolean;
	showInvisibles: boolean;
	showPrintMargin: boolean;
	printMarginColumn: number;
	printMargin: boolean | number;
	showGutter: boolean;
	fadeFoldWidgets: boolean;
	showFoldWidgets: boolean;
	showLineNumbers: boolean;
	displayIndentGuides: boolean;
	highlightIndentGuides: boolean;
	highlightGutterLine: boolean;
	hScrollBarAlwaysVisible: boolean;
	vScrollBarAlwaysVisible: boolean;
	fontSize: number;
	fontFamily: string;
	maxLines: number;
	minLines: number;
	scrollPastEnd: number;
	fixedWidthGutter: boolean;
	customScrollbar: boolean;
	theme: string;
	hasCssTransforms: boolean;
	maxPixelHeight: number;
	useSvgGutterIcons: boolean;
	showFoldedAnnotations: boolean;
	useResizeObserver: boolean;
}

export interface VirtualRenderer extends
		EventEmitter<VirtualRendererEvents>, OptionsProvider<VirtualRendererOptions> {
	$extraHeight?: number,
	$showGutter?: boolean,
	$showPrintMargin?: boolean,
	$printMarginColumn?: number,
	$animatedScroll?: boolean,
	$isMousePressed?: boolean,
	textarea: InputSink, // TextArea
	$hScrollBarAlwaysVisible?: boolean,
	$vScrollBarAlwaysVisible?: boolean
	$maxLines?: number,
	$scrollPastEnd?: number,
	enableKeyboardAccessibility?: boolean,
	$highlightGutterLine?: boolean,
	$minLines?: number,
	$maxPixelHeight?: number,
	$gutterWidth?: number,
	showInvisibles?: boolean,
	$hasCssTransforms?: boolean,
	$blockCursor?: boolean,
	// $useTextareaForIME?: boolean,
	theme?: any,
	$theme?: any,
	destroyed?: boolean,
	session: EditSession,
	keyboardFocusClassName?: string,
}

/**
 * The class that is responsible for drawing everything you see on the screen!
 * @related editor.renderer
 **/
export class VirtualRenderer extends EventEmitter<VirtualRendererEvents> {
	readonly container: Text;
	public $gutter: Text;
	public scroller: Text;
	public content: Morph;
	public $gutterLayer: GutterLayer;
	public $markerBack: MarkerLayer;
	public $textLayer: TextLayer;
	private $markerFront: MarkerLayer;
	public $cursorLayer: CursorLayer;
	private $horizScroll = false;
	private $vScroll = false;
	public scrollBar: VScrollBar;
	public scrollBarV: VScrollBar;
	public scrollBarH: HScrollBar;
	public scrollTop = 0;
	public scrollLeft = 0;
	public cursorPos = { row : 0, column : 0 };
	private $fontMetrics: FontMetrics;

	public $size = {
		width: 0,
		height: 0,
		scrollerHeight: 0,
		scrollerWidth: 0,
		$dirty: true
	};

	public layerConfig: LayerConfig = {
		width : 1,
		padding : 0,
		firstRow : 0,
		firstRowScreen: 0,
		lastRow : 0,
		lineHeight : 0,
		characterWidth : 0,
		minHeight : 1,
		maxHeight : 1,
		offset : 0,
		height : 1,
		gutterOffset: 1
	};

	public scrollMargin = {
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		v: 0,
		h: 0
	};

	public margin = {
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		v: 0,
		h: 0
	};

	public $keepTextAreaAtCursor: boolean = !ace.env.iOS;
	public $loop: RenderLoop;
	public $scrollAnimation?: {from: number, to: number, steps: number[]} | null;
	public $padding: number = 0;
	public gutterWidth: number = 0;

	readonly window: Window;

	/**
	 * Constructs a new `VirtualRenderer` within the `container` specified, applying the given `theme`.
	 * @param {Text | null} [container] The root element of the editor
	 * @param {String} [theme] The starting theme
	 **/
	constructor(container?: Text | null, theme?: string | Theme) {
		super();
		var _self = this;
		if (container) {
			this.container = container;
		} else {
			const window = qk.app.activeWindow;
			util.assert(window, "Active window required to create editor container");
			this.container = new Text(window);
		}
		const window = this.window = this.container.window;

		this.container.addClass('ace_editor');
		this.container.style.layout = 'free'; // Use absolute free layout for all children

		this.setTheme(theme||'');

		this.$gutter = new Text(window);
		this.$gutter.style.layout = 'free';
		this.$gutter.class = ["ace_gutter"];
		this.$gutter.data = {'aria-hidden': true};
		this.container.append(this.$gutter);

		this.scroller = new Text(window);
		this.scroller.class = ["ace_scroller"];
		this.scroller.style = { layout: 'free', width: 'match', height: 'match', align: 'end' };
		this.container.append(this.scroller);

		this.content = new Morph(window);
		this.content.class = ["ace_content"];
		this.content.style.layout = 'free'; // absolute free layout
		this.scroller.append(this.content);

		this.$gutterLayer = new GutterLayer(this.$gutter);
		this.$gutterLayer.on("changeGutterWidth", this.onGutterResize.bind(this));

		this.$markerBack = new MarkerLayer(this.content);
		this.$textLayer = new TextLayer(this.content);
		// this.canvas = textLayer.element;
		this.$markerFront = new MarkerLayer(this.content);
		this.$cursorLayer = new CursorLayer(this.content);

		this.scrollBar =
		this.scrollBarV = new VScrollBar(this.container, this);
		this.scrollBarH = new HScrollBar(this.container, this);
		this.scrollBarV.on("scroll", function(e) {
			if (!_self.$scrollAnimation)
				_self.session.setScrollTop(e.data - _self.scrollMargin.top);
		});
		this.scrollBarH.on("scroll", function(e) {
			if (!_self.$scrollAnimation)
				_self.session.setScrollLeft(e.data - _self.scrollMargin.left);
		});

		this.$fontMetrics = new FontMetrics(this.container);
		this.$textLayer.$setFontMetrics(this.$fontMetrics);
		this.$textLayer.on("changeCharacterSize", function(e) {
			_self.updateCharacterSize();
			_self.onResize(true, _self.gutterWidth, _self.$size.width, _self.$size.height);
			_self._signal("changeCharacterSize", e, _self);
		});

		this.$loop = new RenderLoop(this.$renderChanges.bind(this), window);
		this.$loop.schedule(this.CHANGE_FULL);

		this.updateCharacterSize();
		this.setPadding(4);
		this.$addResizeObserver();
		config.resetOptions(this);
		config._signal("renderer", this);
	}

	// this.$logChanges = function(changes) {
	//     var a = ""
	//     if (changes & this.CHANGE_CURSOR) a += " cursor";
	//     if (changes & this.CHANGE_MARKER) a += " marker";
	//     if (changes & this.CHANGE_GUTTER) a += " gutter";
	//     if (changes & this.CHANGE_SCROLL) a += " scroll";
	//     if (changes & this.CHANGE_LINES) a += " lines";
	//     if (changes & this.CHANGE_TEXT) a += " text";
	//     if (changes & this.CHANGE_SIZE) a += " size";
	//     if (changes & this.CHANGE_MARKER_BACK) a += " marker_back";
	//     if (changes & this.CHANGE_MARKER_FRONT) a += " marker_front";
	//     if (changes & this.CHANGE_FULL) a += " full";
	//     if (changes & this.CHANGE_H_SCROLL) a += " h_scroll";
	//     console.log(a.trim())
	// };

	private $allowBoldFonts?: boolean;
	public characterWidth: number = 0;
	public lineHeight: number = 0;

	updateCharacterSize() {
		if (this.$fontMetrics.allowBoldFonts != this.$allowBoldFonts) {
			this.$allowBoldFonts = this.$fontMetrics.allowBoldFonts;
			this.setStyle("ace_nobold", !this.$allowBoldFonts);
		}
		this.layerConfig.characterWidth =
		this.characterWidth = this.$textLayer.getCharacterWidth();
		this.layerConfig.lineHeight =
		this.lineHeight = this.$textLayer.getLineHeight();
		this.$updatePrintMargin();
		// set explicit line height to avoid normal resolving to different values based on text
		this.scroller.style.lineHeight = this.lineHeight;
	}

	/**
	 *
	 * Associates the renderer with an [[EditSession `EditSession`]].
	 * @param {EditSession} session The session to associate with
	 **/
	setSession(session: EditSession) {
		if (this.session)
			this.session.doc.off("changeNewLineMode", this.onChangeNewLineMode);

		this.session = session;
		if (session && this.scrollMargin.top && session.getScrollTop() <= 0)
			session.setScrollTop(-this.scrollMargin.top);

		this.$cursorLayer.setSession(session);
		this.$markerBack.setSession(session);
		this.$markerFront.setSession(session);
		this.$gutterLayer.setSession(session);
		this.$textLayer.setSession(session);
		if (!session)
			return;

		this.$loop.schedule(this.CHANGE_FULL);
		this.session.$setFontMetrics(this.$fontMetrics);
		this.scrollBarH.scrollLeft = this.scrollBarV.scrollTop = -1;

		this.onChangeNewLineMode = this.onChangeNewLineMode.bind(this);
		this.onChangeNewLineMode();
		this.session.doc.on("changeNewLineMode", this.onChangeNewLineMode);
	}

	private $changedLines: {firstRow: number, lastRow: number} | null = null;

	/**
	 * Triggers a partial update of the text, from the range given by the two parameters.
	 * @param {Number} firstRow The first row to update
	 * @param {Number} lastRow The last row to update
	 * @param {boolean} [force]
	 **/
	updateLines(firstRow: number, lastRow: number, force?: boolean) {
		if (lastRow === undefined)
			lastRow = Infinity;

		if (!this.$changedLines) {
			this.$changedLines = {
				firstRow: firstRow,
				lastRow: lastRow
			};
		}
		else {
			if (this.$changedLines.firstRow > firstRow)
				this.$changedLines.firstRow = firstRow;

			if (this.$changedLines.lastRow < lastRow)
				this.$changedLines.lastRow = lastRow;
		}

		// If the change happened offscreen above us then it's possible
		// that a new line wrap will affect the position of the lines on our
		// screen so they need redrawn.
		// TODO: better solution is to not change scroll position when text is changed outside of visible area
		if (this.$changedLines.lastRow < this.layerConfig.firstRow) {
			if (force)
				this.$changedLines.lastRow = this.layerConfig.lastRow;
			else
				return;
		}
		if (this.$changedLines.firstRow > this.layerConfig.lastRow)
			return;
		this.$loop.schedule(this.CHANGE_LINES);
	}

	/**
	 * @internal
	 */
	onChangeNewLineMode() {
		this.$loop.schedule(this.CHANGE_TEXT);
		this.$textLayer.$updateEolChar();
		this.session.$bidiHandler.setEolChar(this.$textLayer.EOL_CHAR);
	}

	/**
	 * @internal
	 */
	onChangeTabSize() {
		this.$loop.schedule(this.CHANGE_TEXT | this.CHANGE_MARKER);
		this.$textLayer.onChangeTabSize();
	}

	$onChangeTabSize = () => {
		this.onChangeTabSize();
	}

	/**
	 * Triggers a full update of the text, for all the rows.
	 **/
	updateText() {
		this.$loop.schedule(this.CHANGE_TEXT);
	}

	/**
	 * Triggers a full update of all the layers, for all the rows.
	 * @param {Boolean} [force] If `true`, forces the changes through

	 **/
	updateFull(force?: boolean) {
		if (force)
			this.$renderChanges(this.CHANGE_FULL, true);
		else
			this.$loop.schedule(this.CHANGE_FULL);
	}

	/**
	 * Updates the font size.
	 **/
	updateFontSize() {
		this.$textLayer.checkForSizeChanges();
	}

	$updateSizeAsync() {
		if (this.$loop.pending)
			this.$size.$dirty = true;
		else
			this.onResize();
	}

	private resizing: number = 0;
	private $resizeTimer: ReturnType<typeof lang.delayedCall>;

	/**
	 * [Triggers a resize of the editor.]{: #VirtualRenderer.onResize}
	 * @param {Boolean} [force] If `true`, recomputes the size, even if the height and width haven't changed
	 * @param {Number} [gutterWidth] The width of the gutter in pixels
	 * @param {Number} [width] The width of the editor in pixels
	 * @param {Number} [height] The hiehgt of the editor, in pixels
	 * @internal
	 **/
	onResize(force?: boolean, gutterWidth?: number, width?: number, height?: number) {
		if (this.resizing > 2)
			return;
		else if (this.resizing > 0)
			this.resizing++;
		else
			this.resizing = force ? 1 : 0;
		// `|| el.scrollHeight` is required for autosizing editors on ie
		// where elements with clientHeight = 0 also have clientWidth = 0
		var el = this.container;
		var clSize = el.clientSize;
		if (!height)
			height = clSize.height; // el.clientHeight || el.scrollHeight;
		//
		// NOTE:
		// ACE uses a 1px height hack here to force browser reflow and unlock autosize.
		// Qk has explicit layout passes, so this hack is intentionally disabled.
		// Autosize should be triggered after layout / content changes instead.
		//
		// if (!height && this.$maxLines && this.lineHeight > 1) {
		// 	// if we are supposed to fit to content set height at least to 1
		// 	// so that render does not exit early before calling $autosize
		// 	if (!el.style.height || el.style.height == 0) {
		// 		el.style.height = 1;
		// 		height = clSize.height; // el.clientHeight || el.scrollHeight;
		// 	}
		// }
		if (!width)
			width = clSize.width; // el.clientWidth || el.scrollWidth;
		var changes = this.$updateCachedSize(force, gutterWidth, width, height);

		if (this.$resizeTimer) this.$resizeTimer.cancel();

		if (!this.$size.scrollerHeight || (!width && !height))
			return this.resizing = 0;

		if (force)
			this.$gutterLayer.$padding = void 0;

		if (force)
			this.$renderChanges(changes | this.$changes, true);
		else
			this.$loop.schedule(changes | this.$changes);

		if (this.resizing)
			this.resizing = 0;
		// reset cached values on scrollbars, needs to be removed when switching to non-native scrollbars
		// see https://github.com/ajaxorg/ace/issues/2195
		this.scrollBarH.scrollLeft = this.scrollBarV.scrollTop = -1;
	}

	/**
	 * @param [force]
	 * @param [gutterWidth]
	 * @param [width]
	 * @param [height]
	 * @return {number}
	 */
	$updateCachedSize(force?: boolean, gutterWidth?: number, width?: number, height: number = 0) {
		height -= (this.$extraHeight || 0);
		var changes = 0;
		var size = this.$size;
		var oldSize = {
			width: size.width,
			height: size.height,
			scrollerHeight: size.scrollerHeight,
			scrollerWidth: size.scrollerWidth
		};
		if (height && (force || size.height != height)) {
			size.height = height;
			changes |= this.CHANGE_SIZE;

			size.scrollerHeight = size.height;
			if (this.$horizScroll)
				size.scrollerHeight -= this.scrollBarH.getHeight();

			this.scrollBarV.setHeight(size.scrollerHeight);

			changes = changes | this.CHANGE_SCROLL;
		}

		if (width && (force || size.width != width)) {
			changes |= this.CHANGE_SIZE;
			size.width = width;

			if (gutterWidth == null)
				gutterWidth = this.$showGutter ? this.$gutter.clientSize.x : 0;

			this.gutterWidth = gutterWidth;

			size.scrollerWidth = Math.max(0, width - gutterWidth - this.scrollBarV.getWidth() - this.margin.h);
			this.$gutter.marginLeft = this.margin.left;

			var right = this.scrollBarV.getWidth();

			this.scrollBarH.element.style.marginLeft = gutterWidth;
			this.scrollBarH.element.style.marginRight = right;
			this.scrollBarH.setWidth(size.scrollerWidth);

			this.scroller.style.marginLeft = gutterWidth + this.margin.left;
			this.scroller.style.marginRight = right;
			this.scroller.style.marginBottom = this.scrollBarH.getHeight();

			if (this.session && this.session.getUseWrapMode() && this.adjustWrapLimit() || force) {
				changes |= this.CHANGE_FULL;
			}
		}

		size.$dirty = !width || !height;

		if (changes)
			this._signal("resize", oldSize, this);

		return changes;
	}

	/**
	 *
	 * @param {number} width
	 * @internal
	 */
	onGutterResize(width: number) {
		var gutterWidth = this.$showGutter ? width : 0;
		if (gutterWidth != this.gutterWidth)
			this.$changes |= this.$updateCachedSize(true, gutterWidth, this.$size.width, this.$size.height);

		if (this.session.getUseWrapMode() && this.adjustWrapLimit()) {
			this.$loop.schedule(this.CHANGE_FULL);
		} else if (this.$size.$dirty) {
			this.$loop.schedule(this.CHANGE_FULL);
		} else {
			this.$computeLayerConfig();
		}
	}

	/**
	 * Adjusts the wrap limit, which is the number of characters that can fit within the width of the edit area on screen.

	 **/
	adjustWrapLimit() {
		var availableWidth = this.$size.scrollerWidth - this.$padding * 2;
		var limit = Math.floor(availableWidth / this.characterWidth);
		return this.session.adjustWrapLimit(limit, this.$showPrintMargin ? this.$printMarginColumn : 0);
	}

	/**
	 * Identifies whether you want to have an animated scroll or not.
	 * @param {Boolean} shouldAnimate Set to `true` to show animated scrolls

	 **/
	setAnimatedScroll(shouldAnimate: boolean){
		this.setOption("animatedScroll", shouldAnimate);
	}

	/**
	 * Returns whether an animated scroll happens or not.
	 * @returns {Boolean}

	 **/
	getAnimatedScroll() {
		return this.$animatedScroll;
	}

	/**
	 * Identifies whether you want to show invisible characters or not.
	 * @param {Boolean} showInvisibles Set to `true` to show invisibles

	 **/
	setShowInvisibles(showInvisibles: boolean) {
		this.setOption("showInvisibles", showInvisibles);
		this.session.$bidiHandler.setShowInvisibles(showInvisibles);
	}

	/**
	 * Returns whether invisible characters are being shown or not.
	 * @returns {Boolean}

	 **/
	getShowInvisibles() {
		return this.getOption("showInvisibles");
	}

	/**
	 * @return {boolean}

	 */
	getDisplayIndentGuides() {
		return this.getOption("displayIndentGuides");
	}

	/**
	 * @param {boolean} display

	 */
	setDisplayIndentGuides(display: boolean) {
		this.setOption("displayIndentGuides", display);
	}

	/**

	 * @return {boolean}
	 */
	getHighlightIndentGuides() {
		return this.getOption("highlightIndentGuides");
	}

	/**

	 * @param {boolean} highlight
	 */
	setHighlightIndentGuides(highlight: boolean) {
		this.setOption("highlightIndentGuides", highlight);
	}

	/**
	 * Identifies whether you want to show the print margin or not.
	 * @param {Boolean} showPrintMargin Set to `true` to show the print margin

	 **/
	setShowPrintMargin(showPrintMargin: boolean) {
		this.setOption("showPrintMargin", showPrintMargin);
	}

	/**
	 * Returns whether the print margin is being shown or not.
	 * @returns {Boolean}

	 **/
	getShowPrintMargin() {
		return this.getOption("showPrintMargin");
	}
	/**
	 * Identifies whether you want to show the print margin column or not.
	 * @param {number} printMarginColumn Set to `true` to show the print margin column

	 **/
	setPrintMarginColumn(printMarginColumn: number) {
		this.setOption("printMarginColumn", printMarginColumn);
	}

	/**
	 * Returns whether the print margin column is being shown or not.
	 * @returns {number}

	 **/
	getPrintMarginColumn() {
		return this.getOption("printMarginColumn");
	}

	/**
	 * Returns `true` if the gutter is being shown.
	 * @returns {Boolean}

	 **/
	getShowGutter() {
		return this.getOption("showGutter");
	}

	/**
	 * Identifies whether you want to show the gutter or not.
	 * @param {Boolean} show Set to `true` to show the gutter

	 **/
	setShowGutter(show: boolean) {
		return this.setOption("showGutter", show);
	}

	/**

	 * @returns {boolean}
	 */
	getFadeFoldWidgets() {
		return this.getOption("fadeFoldWidgets");
	}

	/**

	 * @param {boolean} show
	 */
	setFadeFoldWidgets(show: boolean) {
		this.setOption("fadeFoldWidgets", show);
	}

	/**
	  *
	 * @param {boolean} shouldHighlight
	 */
	setHighlightGutterLine(shouldHighlight: boolean) {
		this.setOption("highlightGutterLine", shouldHighlight);
	}

	/**

	 * @returns {boolean}
	 */
	getHighlightGutterLine() {
		return this.getOption("highlightGutterLine");
	}

	private $printMarginEl?: Morph;

	/**
	 */
	$updatePrintMargin() {
		if (!this.$showPrintMargin && !this.$printMarginEl)
			return;

		if (!this.$printMarginEl) {
			// var containerEl = dom.createElement("div");
			var containerEl = new Box(this.window);
			containerEl.class = ["ace_layer", "ace_print-margin-layer"];
			// this.$printMarginEl = dom.createElement("div");
			this.$printMarginEl = new Morph(this.window);
			this.$printMarginEl.class = ["ace_print-margin"];
			// containerEl.appendChild(this.$printMarginEl);
			containerEl.append(this.$printMarginEl);
			// this.content.insertBefore(containerEl, this.content.firstChild);
			this.content.first!.before(containerEl);
		}

		// var style = this.$printMarginEl.style;
		// style.left = Math.round(this.characterWidth * this.$printMarginColumn + this.$padding) + "px";
		this.$printMarginEl.x = Math.round(this.characterWidth * this.$printMarginColumn! + this.$padding);
		// style.visibility = this.$showPrintMargin ? "visible" : "hidden";
		this.$printMarginEl.visible = this.$showPrintMargin ? true : false;

		if (this.session && this.session.$wrap == -1)
			this.adjustWrapLimit();
	}

	/**
	 *
	 * Returns the root element containing this renderer.
	 * @returns {Box}
	 **/
	getContainerElement() {
		return this.container;
	}

	/**
	 *
	 * Returns the element that the mouse events are attached to
	 * @returns {Morph}
	 **/
	getMouseEventTarget() {
		return this.scroller;
	}

	/**
	 *
	 * Returns the element to which the hidden text area is added.
	 * @returns {Box}
	 **/
	getTextAreaContainer() {
		return this.container;
	}

	private $composition?: Composition;

	// move text input over the cursor
	// this is required for IME
	$moveTextAreaToCursor() {
		if (this.$isMousePressed) return;
		var composition = this.$composition;
		if (!this.$keepTextAreaAtCursor && !composition) {
			// dom.translate(this.textarea, -100, 0);
			this.textarea.spotRect = newRect(-100, 0, 0, this.lineHeight);
			return;
		}
		var pixelPos = this.$cursorLayer.$pixelPos;
		if (!pixelPos)
			return;
		if (composition && composition.markerRange)
			pixelPos = this.$cursorLayer.getPixelPosition(composition.markerRange.start, true);

		var config = this.layerConfig;
		var posTop = pixelPos.top;
		var posLeft = pixelPos.left;
		posTop -= config.offset;

		var h = ace.env.mobile ? this.lineHeight : 1;
		if (posTop < 0 || posTop > config.height - h) {
			// dom.translate(this.textarea, 0, 0);
			this.textarea.spotRect = newRect(0, 0, 0, this.lineHeight);
			return;
		}

		var w = 1;
		var maxTop = this.$size.height - h;
		if (!composition) {
			posTop += this.lineHeight;
		}
		else {
			posTop += this.lineHeight + 2;
		}

		posLeft -= this.scrollLeft;
		if (posLeft > this.$size.scrollerWidth - w)
			posLeft = this.$size.scrollerWidth - w;

		posLeft += this.gutterWidth + this.margin.left;

		// this.textarea.style.height = h;
		// this.textarea.style.width = w;
		// dom.translate(this.textarea, Math.min(posLeft, this.$size.scrollerWidth - w), Math.min(posTop, maxTop));
		var x = Math.min(posLeft, this.$size.scrollerWidth - w);
		var y = Math.min(posTop, maxTop);
		this.textarea.spotRect = newRect(x, y, w, h);
	}

	/**
	 * [Returns the index of the first visible row.]{: #VirtualRenderer.getFirstVisibleRow}
	 * @returns {Number}
	 **/
	getFirstVisibleRow() {
		return this.layerConfig.firstRow;
	}

	/**
	 *
	 * Returns the index of the first fully visible row. "Fully" here means that the characters in the row are not truncated; that the top and the bottom of the row are on the screen.
	 * @returns {Number}
	 **/
	getFirstFullyVisibleRow() {
		return this.layerConfig.firstRow + (this.layerConfig.offset === 0 ? 0 : 1);
	}

	/**
	 *
	 * Returns the index of the last fully visible row. "Fully" here means that the characters in the row are not truncated; that the top and the bottom of the row are on the screen.
	 * @returns {Number}
	 **/
	getLastFullyVisibleRow() {
		var config = this.layerConfig;
		var lastRow = config.lastRow;
		var top = this.session.documentToScreenRow(lastRow, 0) * config.lineHeight;
		if (top - this.session.getScrollTop() > config.height - config.lineHeight)
			return lastRow - 1;
		return lastRow;
	}

	/**
	 *
	 * [Returns the index of the last visible row.]{: #VirtualRenderer.getLastVisibleRow}
	 * @returns {Number}
	 **/
	getLastVisibleRow() {
		return this.layerConfig.lastRow;
	}

	/**
	 * Sets the padding for all the layers.
	 * @param {Number} padding A new padding value (in pixels)
	 **/
	setPadding(padding: number) {
		this.$padding = padding;
		this.$textLayer.setPadding(padding);
		this.$cursorLayer.setPadding(padding);
		this.$markerFront.setPadding(padding);
		this.$markerBack.setPadding(padding);
		this.$loop.schedule(this.CHANGE_FULL);
		this.$updatePrintMargin();
	}

	/**
	 *
	 * @param {number} [top]
	 * @param {number} [bottom]
	 * @param {number} [left]
	 * @param {number} [right]
	 */
	setScrollMargin(top?: number, bottom?: number, left?: number, right?: number) {
		var sm = this.scrollMargin;
		sm.top = top||0;
		sm.bottom = bottom||0;
		sm.right = right||0;
		sm.left = left||0;
		sm.v = sm.top + sm.bottom;
		sm.h = sm.left + sm.right;
		if (sm.top && this.scrollTop <= 0 && this.session)
			this.session.setScrollTop(-sm.top);
		this.updateFull();
	}

	/**
	 * @param {number} [top]
	 * @param {number} [bottom]
	 * @param {number} [left]
	 * @param {number} [right]
	 */
	setMargin(top?: number, bottom?: number, left?: number, right?: number) {
		var sm = this.margin;
		sm.top = top||0;
		sm.bottom = bottom||0;
		sm.right = right||0;
		sm.left = left||0;
		sm.v = sm.top + sm.bottom;
		sm.h = sm.left + sm.right;
		this.$updateCachedSize(true, this.gutterWidth, this.$size.width, this.$size.height);
		this.updateFull();
	}

	/**
	 * Returns whether the horizontal scrollbar is set to be always visible.
	 * @returns {Boolean}
	 **/
	getHScrollBarAlwaysVisible() {
		return this.$hScrollBarAlwaysVisible;
	}

	/**
	 * Identifies whether you want to show the horizontal scrollbar or not.
	 * @param {Boolean} alwaysVisible Set to `true` to make the horizontal scroll bar visible
	 **/
	setHScrollBarAlwaysVisible(alwaysVisible: boolean) {
		this.setOption("hScrollBarAlwaysVisible", alwaysVisible);
	}
	/**
	 * Returns whether the horizontal scrollbar is set to be always visible.
	 * @returns {Boolean}
	 **/
	getVScrollBarAlwaysVisible() {
		return this.$vScrollBarAlwaysVisible;
	}

	/**
	 * Identifies whether you want to show the horizontal scrollbar or not.
	 * @param {Boolean} alwaysVisible Set to `true` to make the horizontal scroll bar visible
	 **/
	setVScrollBarAlwaysVisible(alwaysVisible: boolean) {
		this.setOption("vScrollBarAlwaysVisible", alwaysVisible);
	}

	/**

	 */
	$updateScrollBarV() {
		var scrollHeight = this.layerConfig.maxHeight;
		var scrollerHeight = this.$size.scrollerHeight;
		if (!this.$maxLines && this.$scrollPastEnd) {
			scrollHeight -= (scrollerHeight - this.lineHeight) * this.$scrollPastEnd;
			if (this.scrollTop > scrollHeight - scrollerHeight) {
				scrollHeight = this.scrollTop + scrollerHeight;
				this.scrollBarV.scrollTop = -1;
			}
		}
		this.scrollBarV.setScrollHeight(scrollHeight + this.scrollMargin.v);
		this.scrollBarV.setScrollTop(this.scrollTop + this.scrollMargin.top);
	}
	$updateScrollBarH() {
		this.scrollBarH.setScrollWidth(this.layerConfig.width + 2 * this.$padding + this.scrollMargin.h);
		this.scrollBarH.setScrollLeft(this.scrollLeft + this.scrollMargin.left);
	}

	freeze() {
		this.$frozen = true;
	}

	unfreeze() {
		this.$frozen = false;
	}

	/**
	 *
	 * @param {number} changes
	 * @param {boolean} [force]
	 * @returns {number}
	 */
	$renderChanges(changes: number, force?: boolean) {
		if (this.$changes) {
			changes |= this.$changes;
			this.$changes = 0;
		}
		if ((!this.session || !this.container.clientSize.x || this.$frozen) || (!changes && !force)) {
			this.$changes |= changes;
			return;
		}
		if (this.$size.$dirty) {
			this.$changes |= changes;
			return this.onResize(true);
		}
		if (!this.lineHeight) {
			this.$textLayer.checkForSizeChanges();
		}
		// this.$logChanges(changes);

		this._signal("beforeRender", changes, this);

		if (this.session && this.session.$bidiHandler)
			this.session.$bidiHandler.updateCharacterWidths(this.$fontMetrics);

		var config = this.layerConfig;
		// text, scrolling and resize changes can cause the view port size to change
		if (changes & this.CHANGE_FULL ||
			changes & this.CHANGE_SIZE ||
			changes & this.CHANGE_TEXT ||
			changes & this.CHANGE_LINES ||
			changes & this.CHANGE_SCROLL ||
			changes & this.CHANGE_H_SCROLL
		) {
			changes |= this.$computeLayerConfig() | this.$loop.clear();
			// If a change is made offscreen and wrapMode is on, then the onscreen
			// lines may have been pushed down. If so, the first screen row will not
			// have changed, but the first actual row will. In that case, adjust
			// scrollTop so that the cursor and onscreen content stays in the same place.
			// TODO: find a better way to handle this, that works non wrapped case and doesn't compute layerConfig twice
			if (config.firstRow != this.layerConfig.firstRow && config.firstRowScreen == this.layerConfig.firstRowScreen) {
				var st = this.scrollTop + (config.firstRow - Math.max(this.layerConfig.firstRow, 0)) * this.lineHeight;
				if (st > 0) {
					// this check is needed as a workaround for the documentToScreenRow returning -1 if document.length == 0
					this.scrollTop = st;
					changes = changes | this.CHANGE_SCROLL;
					changes |= this.$computeLayerConfig() | this.$loop.clear();
				}
			}
			config = this.layerConfig;
			// update scrollbar first to not lose scroll position when gutter calls resize
			this.$updateScrollBarV();
			if (changes & this.CHANGE_H_SCROLL)
				this.$updateScrollBarH();

			this.content.translate = Vec2.new(-this.scrollLeft, -config.offset);

			var width = config.width + 2 * this.$padding;
			var height = config.minHeight;
			this.content.style = { width, height };
		}

		// horizontal scrolling
		if (changes & this.CHANGE_H_SCROLL) {
			this.content.translate = Vec2.new(-this.scrollLeft, -config.offset);
			this.scroller.class = this.scrollLeft <= 0 ? ["ace_scroller"] : ["ace_scroller", "ace_scroll-left"];
			if (this.enableKeyboardAccessibility)
				this.scroller.addClass(this.keyboardFocusClassName!);
		}

		// full
		if (changes & this.CHANGE_FULL) {
			this.$changedLines = null;
			this.$textLayer.update(config);
			if (this.$showGutter)
				this.$gutterLayer.update(config);
			this.$markerBack.update(config);
			this.$markerFront.update(config);
			this.$cursorLayer.update(config);
			this.$moveTextAreaToCursor();
			this._signal("afterRender", changes, this);
			return;
		}

		// scrolling
		if (changes & this.CHANGE_SCROLL) {
			this.$changedLines = null;
			if (changes & this.CHANGE_TEXT || changes & this.CHANGE_LINES)
				this.$textLayer.update(config);
			else
				this.$textLayer.scrollLines(config);

			if (this.$showGutter) {
				if (changes & this.CHANGE_GUTTER || changes & this.CHANGE_LINES)
					this.$gutterLayer.update(config);
				else
					this.$gutterLayer.scrollLines(config);
			}
			this.$markerBack.update(config);
			this.$markerFront.update(config);
			this.$cursorLayer.update(config);
			this.$moveTextAreaToCursor();
			this._signal("afterRender", changes, this);
			return;
		}

		if (changes & this.CHANGE_TEXT) {
			this.$changedLines = null;
			this.$textLayer.update(config);
			if (this.$showGutter)
				this.$gutterLayer.update(config);
		}
		else if (changes & this.CHANGE_LINES) {
			if (this.$updateLines() || (changes & this.CHANGE_GUTTER) && this.$showGutter)
				this.$gutterLayer.update(config);
		}
		else if (changes & this.CHANGE_TEXT || changes & this.CHANGE_GUTTER) {
			if (this.$showGutter)
				this.$gutterLayer.update(config);
		}
		else if (changes & this.CHANGE_CURSOR) {
			if (this.$highlightGutterLine)
				this.$gutterLayer.updateLineHighlight(/*config*/);
		}

		if (changes & this.CHANGE_CURSOR) {
			this.$cursorLayer.update(config);
			this.$moveTextAreaToCursor();
		}

		if (changes & (this.CHANGE_MARKER | this.CHANGE_MARKER_FRONT)) {
			this.$markerFront.update(config);
		}

		if (changes & (this.CHANGE_MARKER | this.CHANGE_MARKER_BACK)) {
			this.$markerBack.update(config);
		}

		this._signal("afterRender", changes, this);
	}

	private desiredHeight: number = 0;

	/**
	 */
	$autosize() {
		var height = this.session.getScreenLength() * this.lineHeight;
		var maxHeight = this.$maxLines! * this.lineHeight;
		var desiredHeight = Math.min(maxHeight,
			Math.max((this.$minLines || 1) * this.lineHeight, height)
		) + this.scrollMargin.v + (this.$extraHeight || 0);
		if (this.$horizScroll)
			desiredHeight += this.scrollBarH.getHeight();
		if (this.$maxPixelHeight && desiredHeight > this.$maxPixelHeight)
			desiredHeight = this.$maxPixelHeight;

		var hideScrollbars = desiredHeight <= 2 * this.lineHeight;
		var vScroll = !hideScrollbars && height > maxHeight;

		if (desiredHeight != this.desiredHeight ||
			this.$size.height != this.desiredHeight || vScroll != this.$vScroll) {
			if (vScroll != this.$vScroll) {
				this.$vScroll = vScroll;
				this.scrollBarV.setVisible(vScroll);
			}
			// var w = this.container.clientWidth;
			var w = this.container.clientSize.x;
			this.container.style.height = desiredHeight;
			this.$updateCachedSize(true, this.$gutterWidth, w, desiredHeight);
			// this.$loop.changes = 0;
			this.desiredHeight = desiredHeight;

			this._signal("autosize", void 0, this);
		}
	}

	/**

	 * @returns {number}
	 */
	$computeLayerConfig() {
		var session = this.session;
		var size = this.$size;

		var hideScrollbars = size.height <= 2 * this.lineHeight;
		var screenLines = this.session.getScreenLength();
		var maxHeight = screenLines * this.lineHeight;

		var longestLine = this.$getLongestLine();

		var horizScroll = !hideScrollbars && (this.$hScrollBarAlwaysVisible ||
			size.scrollerWidth - longestLine - 2 * this.$padding < 0);

		var hScrollChanged = this.$horizScroll !== horizScroll;
		if (hScrollChanged) {
			this.$horizScroll = horizScroll;
			this.scrollBarH.setVisible(horizScroll);
		}
		var vScrollBefore = this.$vScroll; // autosize can change vscroll value in which case we need to update longestLine
		// autoresize only after updating hscroll to include scrollbar height in desired height
		if (this.$maxLines && this.lineHeight > 1){
			this.$autosize();
			// recalculate this after $autosize so we take vertical scroll into account when calculating width
			hideScrollbars = size.height <= 2 * this.lineHeight;
		}

		var minHeight = size.scrollerHeight + this.lineHeight;

		var scrollPastEnd = !this.$maxLines && this.$scrollPastEnd
			? (size.scrollerHeight - this.lineHeight) * this.$scrollPastEnd
			: 0;
		maxHeight += scrollPastEnd;

		var sm = this.scrollMargin;
		this.session.setScrollTop(Math.max(-sm.top,
			Math.min(this.scrollTop, maxHeight - size.scrollerHeight + sm.bottom)));

		this.session.setScrollLeft(Math.max(-sm.left, Math.min(this.scrollLeft,
			longestLine + 2 * this.$padding - size.scrollerWidth + sm.right)));

		var vScroll = !hideScrollbars && (this.$vScrollBarAlwaysVisible ||
			size.scrollerHeight - maxHeight + scrollPastEnd < 0 || this.scrollTop > sm.top);
		var vScrollChanged = vScrollBefore !== vScroll;
		if (vScrollChanged) {
			this.$vScroll = vScroll;
			this.scrollBarV.setVisible(vScroll);
		}

		var offset = this.scrollTop % this.lineHeight;
		var lineCount = Math.ceil(minHeight / this.lineHeight) - 1;
		var firstRow = Math.max(0, Math.round((this.scrollTop - offset) / this.lineHeight));
		var lastRow = firstRow + lineCount;

		// Map lines on the screen to lines in the document.
		var firstRowScreen, firstRowHeight;
		var lineHeight = this.lineHeight;
		firstRow = session.screenToDocumentRow(firstRow, 0);

		// Check if firstRow is inside of a foldLine. If true, then use the first
		// row of the foldLine.
		var foldLine = session.getFoldLine(firstRow);
		if (foldLine) {
			firstRow = foldLine.start.row;
		}

		firstRowScreen = session.documentToScreenRow(firstRow, 0);
		firstRowHeight = session.getRowLength(firstRow) * lineHeight;

		lastRow = Math.min(session.screenToDocumentRow(lastRow, 0), session.getLength() - 1);
		minHeight = size.scrollerHeight + session.getRowLength(lastRow) * lineHeight +
												firstRowHeight;

		offset = this.scrollTop - firstRowScreen * lineHeight;
		// adjust firstRowScreen and offset in case there is a line widget above the first row
		if (offset < 0 && firstRowScreen > 0) {
			firstRowScreen = Math.max(0, firstRowScreen + Math.floor(offset / lineHeight));
			offset = this.scrollTop - firstRowScreen * lineHeight;
		}

		var changes = 0;
		if (this.layerConfig.width != longestLine || hScrollChanged)
			changes = this.CHANGE_H_SCROLL;
		// Horizontal scrollbar visibility may have changed, which changes
		// the client height of the scroller
		if (hScrollChanged || vScrollChanged) {
			changes |= this.$updateCachedSize(true, this.gutterWidth, size.width, size.height);
			this._signal("scrollbarVisibilityChanged", void 0, this);
			if (vScrollChanged)
				longestLine = this.$getLongestLine();
		}

		this.layerConfig = {
			width : longestLine,
			padding : this.$padding,
			firstRow : firstRow,
			firstRowScreen: firstRowScreen,
			lastRow : lastRow,
			lineHeight : lineHeight,
			characterWidth : this.characterWidth,
			minHeight : minHeight,
			maxHeight : maxHeight,
			offset : offset,
			gutterOffset : lineHeight ? Math.max(0, Math.ceil((offset + size.height - size.scrollerHeight) / lineHeight)) : 0,
			height : this.$size.scrollerHeight
		};

		if (this.session.$bidiHandler)
			this.session.$bidiHandler.setContentWidth(longestLine - this.$padding);
		// For debugging.
		// console.log(JSON.stringify(this.layerConfig));

		return changes;
	}

	/**
	 * @returns {boolean | undefined}

	 */
	$updateLines() {
		if (!this.$changedLines) return;
		var firstRow = this.$changedLines.firstRow;
		var lastRow = this.$changedLines.lastRow;
		this.$changedLines = null;

		var layerConfig = this.layerConfig;

		if (firstRow > layerConfig.lastRow + 1) { return; }
		if (lastRow < layerConfig.firstRow) { return; }

		// if the last row is unknown -> redraw everything
		if (lastRow === Infinity) {
			if (this.$showGutter)
				this.$gutterLayer.update(layerConfig);
			this.$textLayer.update(layerConfig);
			return;
		}

		// else update only the changed rows
		this.$textLayer.updateLines(layerConfig, firstRow, lastRow);
		return true;
	}

	/**
	 *
	 * @returns {number}

	 */
	$getLongestLine() {
		var charCount = this.session.getScreenWidth();
		if (this.showInvisibles && !this.session.$useWrapMode)
			charCount += 1;

		if (this.$textLayer && charCount > this.$textLayer.MAX_LINE_LENGTH)
			charCount = this.$textLayer.MAX_LINE_LENGTH + 30;

		return Math.max(this.$size.scrollerWidth - 2 * this.$padding, Math.round(charCount * this.characterWidth));
	}

	/**
	 * Schedules an update to all the front markers in the document.
	 **/
	updateFrontMarkers() {
		this.$markerFront.setMarkers(this.session.getMarkers(true));
		this.$loop.schedule(this.CHANGE_MARKER_FRONT);
	}

	/**
	 *
	 * Schedules an update to all the back markers in the document.
	 **/
	updateBackMarkers() {
		this.$markerBack.setMarkers(this.session.getMarkers());
		this.$loop.schedule(this.CHANGE_MARKER_BACK);
	}

	/**
	 * Deprecated; (moved to [[EditSession]])
	 * @deprecated
	 **/
	addGutterDecoration(row: number, className: string){
		this.$gutterLayer.addGutterDecoration(row, className);
	}

	/**
	 * Deprecated; (moved to [[EditSession]])
	 * @deprecated
	 **/
	removeGutterDecoration(row: number, className: string) {
		this.$gutterLayer.removeGutterDecoration(row, className);
	}

	private _rows: any;

	/**
	 * Redraw breakpoints.
	 * @param {any} [rows]
	 */
	updateBreakpoints(rows?: any) {
		this._rows = rows;
		this.$loop.schedule(this.CHANGE_GUTTER);
	}

	/**
	 * Sets annotations for the gutter.
	 * @param {Annotation[]} annotations An array containing annotations
	 *
	 **/
	setAnnotations(annotations: Annotation[]) {
		this.$gutterLayer.setAnnotations(annotations);
		this.$loop.schedule(this.CHANGE_GUTTER);
	}

	/**
	 *
	 * Updates the cursor icon.
	 **/
	updateCursor() {
		this.$loop.schedule(this.CHANGE_CURSOR);
	}

	/**
	 *
	 * Hides the cursor icon.
	 **/
	hideCursor() {
		this.$cursorLayer.hideCursor();
	}

	/**
	 *
	 * Shows the cursor icon.
	 **/
	showCursor() {
		this.$cursorLayer.showCursor();
	}

	/**
	 *
	 * @param {Point} anchor
	 * @param {Point} lead
	 * @param {number} [offset]
	 */
	scrollSelectionIntoView(anchor: Point, lead: Point, offset?: number) {
		// first scroll anchor into view then scroll lead into view
		this.scrollCursorIntoView(anchor, offset);
		this.scrollCursorIntoView(lead, offset);
	}

	private $stopAnimation?: boolean;

	/**
	 *
	 * Scrolls the cursor into the first visibile area of the editor
	 * @param {Point} [cursor]
	 * @param {number} [offset]
	 * @param {{ top?: any; bottom?: any; }} [$viewMargin]
	 */
	scrollCursorIntoView(cursor?: Point, offset?: number, $viewMargin?: { top?: any; bottom?: any; }) {
		// the editor is not visible
		if (this.$size.scrollerHeight === 0)
			return;

		var pos = this.$cursorLayer.getPixelPosition(cursor);

		var newLeft = pos.left;
		var newTop = pos.top;

		var topMargin = $viewMargin && $viewMargin.top || 0;
		var bottomMargin = $viewMargin && $viewMargin.bottom || 0;

		if (this.$scrollAnimation) {
			this.$stopAnimation = true;
		}

		var currentTop = this.$scrollAnimation ? this.session.getScrollTop() : this.scrollTop;

		if (currentTop + topMargin > newTop) {
			if (offset && currentTop + topMargin > newTop + this.lineHeight)
				newTop -= offset * this.$size.scrollerHeight;
			if (newTop === 0)
				newTop = -this.scrollMargin.top;
			this.session.setScrollTop(newTop);
		} else if (currentTop + this.$size.scrollerHeight - bottomMargin < newTop + this.lineHeight) {
			if (offset && currentTop + this.$size.scrollerHeight - bottomMargin < newTop -  this.lineHeight)
				newTop += offset * this.$size.scrollerHeight;
			this.session.setScrollTop(newTop + this.lineHeight + bottomMargin - this.$size.scrollerHeight);
		}

		var currentLeft = this.scrollLeft;
		// Show 2 context characters of the line when moving to it
		var twoCharsWidth = 2 * this.layerConfig.characterWidth;

		if (newLeft - twoCharsWidth < currentLeft) {
			newLeft -= twoCharsWidth;
			if (newLeft < this.$padding + twoCharsWidth) {
				newLeft = -this.scrollMargin.left;
			}
			this.session.setScrollLeft(newLeft);
		} else {
			newLeft += twoCharsWidth;
			if (currentLeft + this.$size.scrollerWidth < newLeft + this.characterWidth) {
				this.session.setScrollLeft(Math.round(newLeft + this.characterWidth - this.$size.scrollerWidth));
			} else if (currentLeft <= this.$padding && newLeft - currentLeft < this.characterWidth) {
				this.session.setScrollLeft(0);
			}
		}
	}

	/**
	 * {:EditSession.getScrollTop}
	 * @related EditSession.getScrollTop
	 * @returns {Number}
	 **/
	getScrollTop() {
		return this.session.getScrollTop();
	}

	/**
	 * {:EditSession.getScrollLeft}
	 * @related EditSession.getScrollLeft
	 * @returns {Number}
	 **/
	getScrollLeft() {
		return this.session.getScrollLeft();
	}

	/**
	 * Returns the first visible row, regardless of whether it's fully visible or not.
	 * @returns {Number}
	 **/
	getScrollTopRow() {
		return this.scrollTop / this.lineHeight;
	}

	/**
	 * Returns the last visible row, regardless of whether it's fully visible or not.
	 * @returns {Number}
	 **/
	getScrollBottomRow() {
		return Math.max(0, Math.floor((this.scrollTop + this.$size.scrollerHeight) / this.lineHeight) - 1);
	}

	/**
	 * Gracefully scrolls from the top of the editor to the row indicated.
	 * @param {Number} row A row id
	 *
	 * @related EditSession.setScrollTop
	 **/
	scrollToRow(row: number) {
		this.session.setScrollTop(row * this.lineHeight);
	}

	/**
	 * @param {Point} cursor
	 * @param {number} [alignment]
	 * @returns {number}
	 */
	alignCursor(cursor?: Point | number, alignment?: number) {
		if (typeof cursor == "number")
			cursor = {row: cursor, column: 0};

		var pos = this.$cursorLayer.getPixelPosition(cursor);
		var h = this.$size.scrollerHeight - this.lineHeight;
		var offset = pos.top - h * (alignment || 0);

		this.session.setScrollTop(offset);
		return offset;
	}

	/**
	 *
	 * @param {number} fromValue
	 * @param {number} toValue
	 * @returns {*[]}
	 */
	$calcSteps(fromValue: number, toValue: number){
		var i = 0;
		var l = this.STEPS;
		var steps = [];

		var func = function(t: number, x_min: number, dx: number) {
			return dx * (Math.pow(t - 1, 3) + 1) + x_min;
		};

		for (i = 0; i < l; ++i)
			steps.push(func(i / this.STEPS, fromValue, toValue - fromValue));

		return steps;
	}

	/**
	 * Gracefully scrolls the editor to the row indicated.
	 * @param {Number} line A line number
	 * @param {Boolean} center If `true`, centers the editor the to indicated line
	 * @param {Boolean} animate If `true` animates scrolling
	 * @param {() => void} [callback] Function to be called after the animation has finished

	 **/
	scrollToLine(line: number, center: boolean, animate?: boolean, callback?: () => void) {
		var pos = this.$cursorLayer.getPixelPosition({row: line, column: 0});
		var offset = pos.top;
		if (center)
			offset -= this.$size.scrollerHeight / 2;

		var initialScroll = this.scrollTop;
		this.session.setScrollTop(offset);
		if (animate !== false)
			this.animateScrolling(initialScroll, callback);
	}

	private $timer?: TimeoutResult

	/**
	 *
	 * @param fromValue
	 * @param [callback]
	 */
	animateScrolling(fromValue: number, callback?: () => void) {
		var toValue = this.scrollTop;
		if (!this.$animatedScroll)
			return;
		var _self = this;

		if (fromValue == toValue)
			return;

		if (this.$scrollAnimation) {
			var oldSteps = this.$scrollAnimation.steps;
			if (oldSteps.length) {
				fromValue = oldSteps[0];
				if (fromValue == toValue)
					return;
			}
		}

		var steps = _self.$calcSteps(fromValue, toValue);
		this.$scrollAnimation = {from: fromValue, to: toValue, steps: steps};

		clearInterval(this.$timer);

		_self.session.setScrollTop(steps.shift()!);
		// trick session to think it's already scrolled to not loose toValue
		_self.session.$scrollTop = toValue;

		function endAnimation() {
			// @ts-ignore
			_self.$timer = clearInterval(_self.$timer);
			_self.$scrollAnimation = null;
			_self.$stopAnimation = false;
			callback && callback();
		}

		this.$timer = setInterval(function() {
			if (_self.$stopAnimation) {
				endAnimation();
				return;
			}

			if (!_self.session)
				return clearInterval(_self.$timer);
			if (steps.length) {
				_self.session.setScrollTop(steps.shift()!);
				_self.session.$scrollTop = toValue;
			} else if (toValue != null) {
				_self.session.$scrollTop = -1;
				_self.session.setScrollTop(toValue);
				toValue = null!;
			} else {
				// do this on separate step to not get spurious scroll event from scrollbar
				endAnimation();
			}
		}, 10);
	}

	/**
	 * Scrolls the editor to the y pixel indicated.
	 * @param {Number} scrollTop The position to scroll to
	 **/
	scrollToY(scrollTop: number) {
		// after calling scrollBar.setScrollTop
		// scrollbar sends us event with same scrollTop. ignore it
		if (this.scrollTop !== scrollTop) {
			this.$loop.schedule(this.CHANGE_SCROLL);
			this.scrollTop = scrollTop;
		}
	}

	/**
	 * Scrolls the editor across the x-axis to the pixel indicated.
	 * @param {Number} scrollLeft The position to scroll to
	 **/
	scrollToX(scrollLeft: number) {
		if (this.scrollLeft !== scrollLeft)
			this.scrollLeft = scrollLeft;
		this.$loop.schedule(this.CHANGE_H_SCROLL);
	}

	/**
	 * Scrolls the editor across both x- and y-axes.
	 * @param {Number} x The x value to scroll to
	 * @param {Number} y The y value to scroll to
	 **/
	scrollTo(x: number, y: number) {
		this.session.setScrollTop(y);
		this.session.setScrollLeft(x);
	}

	/**
	 * Scrolls the editor across both x- and y-axes.
	 * @param {Number} deltaX The x value to scroll by
	 * @param {Number} deltaY The y value to scroll by
	 **/
	scrollBy(deltaX: number, deltaY: number) {
		deltaY && this.session.setScrollTop(this.session.getScrollTop() + deltaY);
		deltaX && this.session.setScrollLeft(this.session.getScrollLeft() + deltaX);
	}

	/**
	 * Returns `true` if you can still scroll by either parameter; in other words, you haven't reached the end of the file or line.
	 * @param {Number} deltaX The x value to scroll by
	 * @param {Number} deltaY The y value to scroll by
	 *
	 * @returns {Boolean}
	 **/
	isScrollableBy(deltaX: number, deltaY: number) {
		if (deltaY < 0 && this.session.getScrollTop() >= 1 - this.scrollMargin.top)
		   return true;
		if (deltaY > 0 && this.session.getScrollTop() + this.$size.scrollerHeight
			- this.layerConfig.maxHeight < -1 + this.scrollMargin.bottom)
		   return true;
		if (deltaX < 0 && this.session.getScrollLeft() >= 1 - this.scrollMargin.left)
			return true;
		if (deltaX > 0 && this.session.getScrollLeft() + this.$size.scrollerWidth
			- this.layerConfig.width < -1 + this.scrollMargin.right)
		   return true;
	}

	/**
	 *
	 * @param {number} x
	 * @param {number} y
	 * @returns {ScreenCoordinates}

	 */
	pixelToScreenCoordinates(x: number, y: number) {
		var canvasPos: Vec2;
		if (this.$hasCssTransforms) {
			canvasPos = Vec2.new(0,0);
			var p = this.$fontMetrics.transformCoordinates([x, y]);
			x = p.x - this.gutterWidth - this.margin.left;
			y = p.y;
		} else {
			// canvasPos = this.scroller.getBoundingClientRect();
			canvasPos = this.scroller.position;
		}

		var offsetX = x + this.scrollLeft - canvasPos.x - this.$padding;
		var offset = offsetX / this.characterWidth;
		var row = Math.floor((y + this.scrollTop - canvasPos.y) / this.lineHeight);
		var col = this.$blockCursor ? Math.floor(offset) : Math.round(offset);

		return {row: row, column: col, side: offset - col > 0 ? 1 : -1, offsetX:  offsetX};
	}

	/**
	 *
	 * @param {number} x
	 * @param {number} y
	 * @returns {Point}

	 */
	screenToTextCoordinates(x: number, y: number) {
		var canvasPos: Vec2;
		if (this.$hasCssTransforms) {
			canvasPos = Vec2.new(0,0);
			var p = this.$fontMetrics.transformCoordinates([x, y]);
			x = p.x - this.gutterWidth - this.margin.left;
			y = p.y;
		} else {
			// canvasPos = this.scroller.getBoundingClientRect();
			canvasPos = this.scroller.position;
		}

		var offsetX = x + this.scrollLeft - canvasPos.x - this.$padding;
		var offset = offsetX / this.characterWidth;
		var col = this.$blockCursor ? Math.floor(offset) : Math.round(offset);

		var row = Math.floor((y + this.scrollTop - canvasPos.y) / this.lineHeight);
		return this.session.screenToDocumentPosition(row, Math.max(col, 0), offsetX);
	}

	/**
	 * Returns an object containing the `pageX` and `pageY` coordinates of the document position.
	 * @param {Number} row The document row position
	 * @param {Number} column The document column position
	 *
	 * @returns {{ pageX: number, pageY: number}}
	 **/
	textToScreenCoordinates(row: number, column: number) {
		// var canvasPos = this.scroller.getBoundingClientRect();
		var canvasPos = this.scroller.position;
		var pos = this.session.documentToScreenPosition(row, column);

		var x = this.$padding + (this.session.$bidiHandler.isBidiRow(pos.row, row)
			 ? this.session.$bidiHandler.getPosLeft(pos.column)
			 : Math.round(pos.column * this.characterWidth));

		var y = pos.row * this.lineHeight;

		return {
			pageX: canvasPos.x + x - this.scrollLeft,
			pageY: canvasPos.y + y - this.scrollTop
		};
	}

	/**
	 * Focuses the current container.
	 **/
	visualizeFocus() {
		// dom.addCssClass(this.container, "ace_focus");
		this.container.addClass("ace_focus");
	}

	/**
	 *
	 * Blurs the current container.
	 **/
	visualizeBlur() {
		// dom.removeCssClass(this.container, "ace_focus");
		this.container.removeClass("ace_focus");
	}

	/**
	 * @param {Object} composition

	 **/
	showComposition(composition: Composition) {
		this.$composition = composition;
		// if (!composition.cssStyle) {
		// 	// composition.cssText = this.textarea.style.cssText;
		// 	composition.cssStyle = {
		// 		marginLeft: this.textarea.marginLeft,
		// 		marginTop: this.textarea.marginTop,
		// 		width: this.textarea.width,
		// 		height: this.textarea.height,
		// 	}
		// }
		// if (composition.useTextareaForIME == undefined)
		// 	composition.useTextareaForIME = this.$useTextareaForIME;

		// if (this.$useTextareaForIME) {
		// 	this.textarea.addClass("ace_composition");
		// 	// this.textarea.style.cssText = "";
		// 	this.textarea.style = {marginLeft: 0, marginTop: 0, width: 'auto', height: 'auto'};
		// 	this.$moveTextAreaToCursor();
		// 	this.$cursorLayer.element.visible = false;
		// }
		// else {
		composition.markerId = this.session.addMarker(composition.markerRange, "ace_composition_marker", "text");
		// }
	}

	/**
	 * @param {String} text A string of text to use
	 *
	 * Sets the inner text of the current composition to `text`.

	 **/
	setCompositionText(text: string) {
		var cursor = this.session.selection.cursor;
		this.addToken(text, "composition_placeholder", cursor.row, cursor.column);
		this.$moveTextAreaToCursor();
	}

	/**
	 *
	 * Hides the current composition.

	 **/
	hideComposition() {
		if (!this.$composition)
			return;

		if (this.$composition.markerId)
			this.session.removeMarker(this.$composition.markerId);

		this.textarea.removeClass("ace_composition");
		var cursor = this.session.selection.cursor;
		this.removeExtraToken(cursor.row, cursor.column);
		this.$composition = void 0;
		this.$cursorLayer.element.visible = true;
	}

	public $ghostText?: { text: string; position: { row: number; column: number } };
	public $ghostTextWidget?: LineWidget;

	/**
	 * @param {string} text
	 * @param {Point} [position]
	 */
	setGhostText(text: string, position?: Point) {
		var cursor = this.session.selection.cursor;
		var insertPosition = position || { row: cursor.row, column: cursor.column };

		this.removeGhostText();

		var textChunks = this.$calculateWrappedTextChunks(text, insertPosition);
		this.addToken(textChunks[0].text, "ghost_text", insertPosition.row, insertPosition.column);

		this.$ghostText = {
			text: text,
			position: {
				row: insertPosition.row,
				column: insertPosition. column
			}
		};

		// var widgetDiv = dom.createElement("div");
		var widgetDiv = new Box(this.window);
		if (textChunks.length > 1) {
			// If there are tokens to the right of the cursor, hide those.
			var hiddenTokens = this.hideTokensAfterPosition(insertPosition.row, insertPosition.column);

			// TODO ... use Quark's Text and Label instead of divs and spans
			// Add the rest of the ghost text lines as a line widget.
			var lastLineText: Text;
			textChunks.slice(1).forEach(el => {
				// var chunkDiv = dom.createElement("div");
				var chunkDiv = new Text(this.window);
				// var chunkSpan = dom.createElement("span");
				var chunkSpan = new Label(this.window);
				// chunkSpan.className = "ace_ghost_text";
				chunkSpan.class = ["ace_ghost_text"];

				// If the line is wider than the viewport, wrap the line
				// if (el.wrapped) chunkDiv.className = "ghost_text_line_wrapped";
				if (el.wrapped) chunkDiv.class = ["ghost_text_line_wrapped"];

				// If a given line doesn't have text (e.g. it's a line of whitespace), set a space as the
				// textcontent so that browsers render the empty line div.
				if (el.text.length === 0) el.text = " ";

				// chunkSpan.appendChild(dom.createTextNode(el.text));
				// chunkDiv.appendChild(chunkSpan);
				chunkDiv.append(chunkSpan);
				// widgetDiv.appendChild(chunkDiv);
				widgetDiv.append(chunkDiv);

				// Overwrite lastLineDiv every iteration so at the end it points to
				// the last added element.
				lastLineText = chunkDiv;
			});

			// Add the hidden tokens to the last line of the ghost text.
			hiddenTokens.forEach(token => {
				// var element = dom.createElement("span");
				var element = new Label(this.window);
				if (!isTextToken(token.type)) element.class = ["ace_" + token.type.replace(/\./g, " ace_")];
				// element.appendChild(dom.createTextNode(token.value));
				var element = new Label(this.window);
				// lastLineDiv.appendChild(element);
				lastLineText.append(element);
			});

			this.$ghostTextWidget = {
				el: widgetDiv,
				row: insertPosition.row,
				column: insertPosition.column,
				className: "ace_ghost_text_container"
			};
			this.session.widgetManager.addLineWidget(this.$ghostTextWidget);

			// Check wether the line widget fits in the part of the screen currently in view
			var pixelPosition = this.$cursorLayer.getPixelPosition(insertPosition, true);
			var el = this.container;
			// var height = el.getBoundingClientRect().height;
			var height = el.clientSize.y;
			var ghostTextHeight = textChunks.length * this.lineHeight;
			var fitsY = ghostTextHeight < (height - pixelPosition.top);

			// If it fits, no action needed
			if (fitsY) return;

			// If it can fully fit in the screen, scroll down until it fits on the screen
			// if it cannot fully fit, scroll so that the row with the cursor
			// is at the top of the screen.
			if (ghostTextHeight < height) {
				this.scrollBy(0, (textChunks.length - 1) * this.lineHeight);
			} else {
				this.scrollToRow(insertPosition.row);
			}
		}

	}

	/**
	 * Calculates and organizes text into wrapped chunks. Initially splits the text by newline characters,
	 * then further processes each line based on display tokens and session settings for tab size and wrapping limits.
	 *
	 * @param {string} text
	 * @param {Point} position
	 * @return {{text: string, wrapped: boolean}[]}
	 */
	$calculateWrappedTextChunks(text: string, position: Point): {text: string, wrapped: boolean}[] {
		var availableWidth = this.$size.scrollerWidth - this.$padding * 2;
		var limit = Math.floor(availableWidth / this.characterWidth) - 2;
		limit = limit <= 0 ? 60 : limit; // this is a hack to prevent the editor from crashing when the window is too small

		var textLines = text.split(/\r?\n/);
		var textChunks = [];
		for (var i = 0; i < textLines.length; i++) {
			var displayTokens = this.session.$getDisplayTokens(textLines[i], position.column);
			var wrapSplits = this.session.$computeWrapSplits(displayTokens, limit, this.session.$tabSize);

			if (wrapSplits.length > 0) {
				var start = 0;
				wrapSplits.push(textLines[i].length);

				for (var j = 0; j < wrapSplits.length; j++) {
					let textSlice = textLines[i].slice(start, wrapSplits[j]);
					textChunks.push({text: textSlice, wrapped: true});
					start = wrapSplits[j];
				}
			}
			else {
				textChunks.push({text: textLines[i], wrapped: false});
			}
		}
		return textChunks;
	}

	removeGhostText() {
		if (!this.$ghostText) return;

		var position = this.$ghostText.position;
		this.removeExtraToken(position.row, position.column);
		if (this.$ghostTextWidget) {
			this.session.widgetManager.removeLineWidget(this.$ghostTextWidget);
			this.$ghostTextWidget = void 0;
		}
		this.$ghostText = void 0;
	}

	/**
	 * @param {string} text
	 * @param {string} type
	 * @param {number} row
	 * @param {number} [column]
	 */
	addToken(text: string, type: string, row: number, column?: number) {
		var session = this.session;
		session.bgTokenizer.lines[row] = null;
		var newToken = {type: type, value: text};
		var tokens = session.getTokens(row);
		if (column == null || !tokens.length) {
			tokens.push(newToken);
		} else {
			var l = 0;
			for (var i =0; i < tokens.length; i++) {
				var token = tokens[i];
				l += token.value.length;
				if (column <= l) {
					var diff = token.value.length - (l - column);
					var before = token.value.slice(0, diff);
					var after = token.value.slice(diff);

					tokens.splice(i, 1, {type: token.type, value: before},  newToken,  {type: token.type, value: after});
					break;
				}
			}
		}
		this.updateLines(row, row);
	}

	// Hide all non-ghost-text tokens to the right of a given position.
	hideTokensAfterPosition(row: number, column: number) {
		var tokens = this.session.getTokens(row);
		var l = 0;
		var hasPassedCursor = false;
		var hiddenTokens = [];
		// Loop over all tokens and track at what position in the line they end.
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			l += token.value.length;

			if (token.type === "ghost_text") continue;

			// If we've already passed the current cursor position, mark all of them as hidden.
			if (hasPassedCursor) {
				hiddenTokens.push({type: token.type, value: token.value});
				token.type = "hidden_token";
				continue;
			}
			// We call this method after we call addToken, so we are guaranteed a new token starts at the cursor position.
			// Once we reached that point in the loop, flip the flag.
			if (l === column) {
				hasPassedCursor = true;
			}
		}
		this.updateLines(row, row);
		return hiddenTokens;
	}

	removeExtraToken(row: number, column: number) {
		this.session.bgTokenizer.lines[row] = null;
		this.updateLines(row, row);
	}

	private $themeId: string | Theme;

	/**
	 * [Sets a new theme for the editor. `theme` should exist, and be a directory path, like `ace/theme/textmate`.]{: #VirtualRenderer.setTheme}
	 * @param {String | Theme} [theme] The path to a theme
	 * @param {() => void} [cb] optional callback

	 **/
	setTheme(theme: string | Theme, cb?: () => void) {
		var _self = this;
		/**@type {any}*/
		this.$themeId = theme;
		_self._emit('themeChange',{theme}, this);

		if (!theme || typeof theme == "string") {
			var moduleName = theme || this.$options.theme.initialValue; // default theme
			// config.loadModule(["theme", moduleName], afterLoad);
			import(moduleName).then(afterLoad);
		} else {
			afterLoad(theme);
		}

		/**
		 * @param {Theme} module
		 */
		function afterLoad(module: Theme) {
			if (_self.$themeId != theme)
				return cb && cb();
			if (!module || !module.cssClass)
				throw new Error("couldn't load module " + theme + " or it didn't call define");
			if (module.$id)
				_self.$themeId = module.$id;
			// dom.importCssString(
			// 	module.cssText,
			// 	module.cssClass,
			// 	_self.container
			// );
			if (_self.theme)
				_self.container.removeClass(_self.theme.cssClass); // remove old theme class
			/**@type {any}*/
			var padding = "padding" in module ? module.padding!
				: "padding" in (_self.theme || {}) ? 4 : _self.$padding;
			if (_self.$padding && padding != _self.$padding)
				_self.setPadding(padding);

			if (_self.$gutterLayer) {
				var showGutterCursor = module["$showGutterCursorMarker"];
				if (showGutterCursor && !_self.$gutterLayer.$showCursorMarker) {
					_self.$gutterLayer.$showCursorMarker = "theme";
				} else if (!showGutterCursor && _self.$gutterLayer.$showCursorMarker == "theme") {
					_self.$gutterLayer.$showCursorMarker = null;
				}
			}

			// this is kept only for backwards compatibility
			_self.$theme = module.cssClass;

			_self.theme = module;
			_self.container.addClass(module.cssClass);
			_self.container.cssclass[module.isDark ? "add" : "remove"]("ace_dark");

			// force re-measure of the gutter width
			if (_self.$size) {
				_self.$size.width = 0;
				_self.$updateSizeAsync();
			}

			_self._emit('themeLoaded', {theme:module}, _self);
			cb && cb();
		}
	}

	/**
	 * [Returns the path of the current theme.]{: #VirtualRenderer.getTheme}
	 * @returns {String}
	 **/
	getTheme() {
		return this.$themeId;
	}

	// Methods allows to add / remove CSS classnames to the editor element.
	// This feature can be used by plug-ins to provide a visual indication of
	// a certain mode that editor is in.

	/**
	 * [Adds a new class, `style`, to the editor.]{: #VirtualRenderer.setStyle}
	 * @param {String} style A class name
	 * @param {boolean}[include]
	 **/
	setStyle(style: string, include?: boolean) {
		if (include !== false) {
			this.container.addClass(style);
		} else {
			this.container.removeClass(style);
		}
	}

	/**
	 * [Removes the class `style` from the editor.]{: #VirtualRenderer.unsetStyle}
	 * @param {String} style A class name
	 *
	 **/
	unsetStyle(style: string) {
		this.container.removeClass(style);
	}

	/**
	 * @param {CursorStyle} style
	 */
	setCursorStyle(style: CursorStyle) {
		this.scroller.style.cursor = style;
	}

	/**
	 * @param {CursorStyle} cursorStyle A css cursor style
	 **/
	setMouseCursor(cursorStyle: CursorStyle) {
		this.scroller.style.cursor = cursorStyle;
	}

	attachToShadowRoot() {
		// dom.importCssString(editorCss, "ace_editor.css", this.container);
	}

	/**
	 * Destroys the text and cursor layers for this renderer.

	 **/
	destroy() {
		this.freeze();
		this.$fontMetrics.destroy();
		this.$cursorLayer.destroy();
		this.removeAllListeners();
		this.container.removeAllChild(); // Quark equivalent
		this.setOption("useResizeObserver", false);
	}

	$addResizeObserver() {
		// if (!window.ResizeObserver || this.$resizeObserver)
		// 	return;
		// var self = this;
		// this.$resizeTimer = lang.delayedCall(function() {
		// 	if (!self.destroyed) self.onResize();
		// }, 50);
		// this.$resizeObserver = new window.ResizeObserver(function(e) {
		// 	var w = e[0].contentRect.width;
		// 	var h = e[0].contentRect.height;
		// 	if (
		// 		Math.abs(self.$size.width - w) > 1
		// 		|| Math.abs(self.$size.height - h) > 1
		// 	) {
		// 		self.$resizeTimer.delay();
		// 	} else {
		// 		self.$resizeTimer.cancel();
		// 	}
		// });
		// this.$resizeObserver.observe(this.container);
	}

	private placeholderNode?: Text;

	$updatePlaceholder(placeholder: string = '') {
		var hasValue = this.session && (this.$composition ||
				this.session.getLength() > 1 || this.session.getLine(0).length > 0);
		if (hasValue && this.placeholderNode) {
			this.off("afterRender", this.$updatePlaceholder);
			this.container.removeClass("ace_hasPlaceholder");
			this.placeholderNode.remove();
			this.placeholderNode = void 0;
		} else if (!hasValue && !this.placeholderNode) {
			this.on("afterRender", this.$updatePlaceholder);
			this.container.addClass("ace_hasPlaceholder");
			// var el = dom.createElement("div");
			var el = new Text(this.window);
			el.class = ["ace_placeholder"];
			el.value = placeholder;
			this.placeholderNode = el;
			this.content.append(this.placeholderNode);
		} else if (!hasValue && this.placeholderNode) {
			this.placeholderNode.value = placeholder;
		}
	}

	CHANGE_CURSOR = 1;
	CHANGE_MARKER = 2;
	CHANGE_GUTTER = 4;
	CHANGE_SCROLL = 8;
	CHANGE_LINES = 16;
	CHANGE_TEXT = 32;
	CHANGE_SIZE = 64;
	CHANGE_MARKER_BACK = 128;
	CHANGE_MARKER_FRONT = 256;
	CHANGE_FULL = 512;
	CHANGE_H_SCROLL = 1024;
	$changes = 0;
	$frozen = false;
	STEPS = 8;
}

config.defineOptions(VirtualRenderer.prototype, "renderer", {
	useResizeObserver: {
		set: function(value: boolean) {
			// if (!value && this.$resizeObserver) {
			// 	this.$resizeObserver.disconnect();
			// 	this.$resizeTimer.cancel();
			// 	this.$resizeTimer = this.$resizeObserver = null;
			// } else if (value && !this.$resizeObserver) {
			// 	this.$addResizeObserver();
			// }
		}
	},
	animatedScroll: {initialValue: false},
	showInvisibles: {
		set: function(this: VirtualRenderer, value: boolean) {
			if (this.$textLayer.setShowInvisibles(value))
				this.$loop.schedule(this.CHANGE_TEXT);
		},
		initialValue: false
	},
	showPrintMargin: {
		set: function(this: VirtualRenderer, ) { this.$updatePrintMargin(); },
		initialValue: true
	},
	printMarginColumn: {
		set: function(this: VirtualRenderer, ) { this.$updatePrintMargin(); },
		initialValue: 80
	},
	printMargin: {
		set: function(this: VirtualRenderer, val: boolean) {
			if (typeof val == "number")
				this.$printMarginColumn = val;
			this.$showPrintMargin = !!val;
			this.$updatePrintMargin();
		},
		get: function() {
			return this.$showPrintMargin && this.$printMarginColumn;
		}
	},
	showGutter: {
		set: function(show: boolean) {
			this.$gutter.visibile = show;
			this.$loop.schedule(this.CHANGE_FULL);
			this.onGutterResize();
		},
		initialValue: true
	},
	useSvgGutterIcons: {
		set: function(this: VirtualRenderer, value: boolean){
			this.$gutterLayer.$useSvgGutterIcons = value;
		},
		initialValue: false
	},
	showFoldedAnnotations: {
		set: function(this: VirtualRenderer, value: boolean) {
			this.$gutterLayer.$showFoldedAnnotations = value;
		},
		initialValue: false
	},
	fadeFoldWidgets: {
		set: function(show: boolean) {
			// dom.setCssClass(this.$gutter, "ace_fade-fold-widgets", show);
			(this.$gutter as Text).cssclass[show ? "add" : "remove"]("ace_fade-fold-widgets");
		},
		initialValue: false
	},
	showFoldWidgets: {
		set: function(this: VirtualRenderer, show: boolean) {
			this.$gutterLayer.setShowFoldWidgets(show);
			this.$loop.schedule(this.CHANGE_GUTTER);
		},
		initialValue: true
	},
	displayIndentGuides: {
		set: function(this: VirtualRenderer, show: boolean) {
			if (this.$textLayer.setDisplayIndentGuides(show))
				this.$loop.schedule(this.CHANGE_TEXT);
		},
		initialValue: true
	},
	highlightIndentGuides: {
		set: function (this: VirtualRenderer, show: boolean) {
			if (this.$textLayer.setHighlightIndentGuides(show) == true) {
				this.$textLayer.$highlightIndentGuide();
			}
			else {
				this.$textLayer.$clearActiveIndentGuide(this.$textLayer.$lines.cells);
			}
		},
		initialValue: true
	},
	highlightGutterLine: {
		set: function(this: VirtualRenderer, shouldHighlight: boolean) {
			this.$gutterLayer.setHighlightGutterLine(shouldHighlight);
			this.$loop.schedule(this.CHANGE_GUTTER);
		},
		initialValue: true
	},
	hScrollBarAlwaysVisible: {
		set: function(val: boolean) {
			if (!this.$hScrollBarAlwaysVisible || !this.$horizScroll)
				this.$loop.schedule(this.CHANGE_SCROLL);
		},
		initialValue: false
	},
	vScrollBarAlwaysVisible: {
		set: function(val: boolean) {
			if (!this.$vScrollBarAlwaysVisible || !this.$vScroll)
				this.$loop.schedule(this.CHANGE_SCROLL);
		},
		initialValue: false
	},
	fontSize: {
		set: function(this: VirtualRenderer, size: number) {
			(this.container as Text).style.fontSize = size || 12;
			this.updateFontSize();
		},
		initialValue: 12
	},
	fontFamily: {
		set: function(this: VirtualRenderer, name: string) {
			(this.container as Text).style.fontFamily = name;
			this.updateFontSize();
		}
	},
	maxLines: {
		set: function(this: VirtualRenderer, val: number) {
			this.updateFull();
		}
	},
	minLines: {
		set: function(this: any, val: number) {
			if (!(this.$minLines < 0x1ffffffffffff))
				this.$minLines = 0;
			this.updateFull();
		}
	},
	maxPixelHeight: {
		set: function(val: number) {
			this.updateFull();
		},
		initialValue: 0
	},
	scrollPastEnd: {
		set: function(this: any, val: number) {
			val = +val || 0;
			if (this.$scrollPastEnd == val)
				return;
			this.$scrollPastEnd = val;
			this.$loop.schedule(this.CHANGE_SCROLL);
		},
		initialValue: 0,
		handlesSet: true
	},
	fixedWidthGutter: {
		set: function(this: /*VirtualRenderer*/any, val: boolean) {
			this.$gutterLayer.$fixedWidth = !!val;
			this.$loop.schedule(this.CHANGE_GUTTER);
		}
	},
	theme: {
		set: function(this: VirtualRenderer, val: string) { this.setTheme(val); },
		get: function(this: any) { return this.$themeId || this.theme; },
		initialValue: "./theme/textmate",
		handlesSet: true
	},
	hasCssTransforms: {
	},
	// useTextareaForIME: {
	// 	// initialValue: !useragent.isMobile && !useragent.isIE
	// 	initialValue: !ace.env.mobile
	// },
});
