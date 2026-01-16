"use strict";


import {BaseDiffView, DiffChunk, DiffHighlight} from "./base_diff_view"
import {VirtualRenderer as Renderer} from "../../virtual_renderer"
import config from "../../config";
import type {DiffModel} from "../diff";
import type {Text as TextView} from 'quark';
import type { Editor } from "../../editor";
import type { EditSession } from "../../edit_session";
import type { MouseEvent } from "../../mouse/mouse_event";
import type { MouseEvent as UIMouseEvent, UIEvent} from "quark/event";
import type { Marker } from "../../layer/marker";

export class InlineDiffView extends BaseDiffView {
	/**
	 * Constructs a new inline DiffView instance.
	 * @param {import("../diff").DiffModel} [diffModel] - The model for the diff view.
	 * @param {Text} [container] - optional container element for the DiffView.
	 */
	constructor(diffModel?: DiffModel, container?: TextView) {
		super(void 0, container);
		diffModel = diffModel || {};
		diffModel.inline = diffModel.inline || "a";
		super( true, container);
		this.init(diffModel);
	}

	textLayer: Renderer["$textLayer"];
	markerLayer: Renderer["$markerBack"];
	gutterLayer: Renderer["$gutterLayer"];
	cursorLayer: Renderer["$cursorLayer"];
	otherEditor: Editor;
	otherSession: EditSession;
	showSideA: boolean;
	// syncSelectionMarkerA: {id: number};
	// syncSelectionMarkerB: {id: number};
	othertextInput: Editor["textInput"];
	otherEditorContainer: Editor["container"];
	scheduleRealign: () => void;
	onMouseDetach: () => void;

	init(diffModel: DiffModel) {
		this.onSelect = this.onSelect.bind(this);
		this.onAfterRender = this.onAfterRender.bind(this);
		

		this.$setupModels(diffModel);
		this.onChangeTheme();
		config.resetOptions(this);
		config._signal("diffView", this);

		var padding = this.activeEditor.renderer.$padding;

		this.addGutterDecorators();

		this.otherEditor.renderer.setPadding(padding);
		this.textLayer = this.otherEditor.renderer.$textLayer;
		this.markerLayer = this.otherEditor.renderer.$markerBack;
		this.gutterLayer = this.otherEditor.renderer.$gutterLayer;
		this.cursorLayer = this.otherEditor.renderer.$cursorLayer;

		this.otherEditor.renderer.$updateCachedSize = function() {
			return 0;
		};

		var textLayerElement = this.activeEditor.renderer.$textLayer.element;
		textLayerElement.before(this.textLayer.element);

		var markerLayerElement = this.activeEditor.renderer.$markerBack.element;
		markerLayerElement.after(this.markerLayer.element);

		var gutterLayerElement = this.activeEditor.renderer.$gutterLayer.element;
		gutterLayerElement.after(this.gutterLayer.element);

		// gutterLayerElement.style.position = "absolute";
		// this.gutterLayer.element.style.position = "absolute";
		this.gutterLayer.element.style.width = "100%";
		this.gutterLayer.element.cssclass.add("ace_mini-diff_gutter_other");
		

		this.gutterLayer.$updateGutterWidth = function() {};
		this.initMouse();
		this.initTextInput();
		this.initTextLayer();
		this.initRenderer();

		this.$attachEventHandlers();
		this.selectEditor(this.activeEditor);
	}

	initRenderer(restore?: boolean) {
		if (restore) {
			// delete custom longest line function
			delete (this.activeEditor.renderer as any).$getLongestLine;
		} else {
			this.editorA.renderer.$getLongestLine =
			this.editorB.renderer.$getLongestLine = () => {
				var getLongestLine = Renderer.prototype.$getLongestLine;
				return Math.max(
					getLongestLine.call(this.editorA.renderer),
					getLongestLine.call(this.editorB.renderer)
				);
			};
		}
	}

	initTextLayer() {
		var renderLine = this.textLayer.$renderLine;
		var diffView = this;
		this.otherEditor.renderer.$textLayer.$renderLine = function(parent, row, foldLIne) {
			if (isVisibleRow(diffView.chunks, row)) {
				renderLine.call(this, parent, row, foldLIne);
			}
		};
		var side: "new" | "old" = this.showSideA ? "new" : "old";
		function isVisibleRow(chunks: DiffChunk[], row: number) {
			var min = 0;
			var max = chunks.length - 1;
			var result = -1;
			while (min < max) {
				var mid = Math.floor((min + max) / 2);
				var chunkStart = chunks[mid][side].start.row;
				if (chunkStart < row) {
					result = mid;
					min = mid + 1;
				} else if (chunkStart > row) {
					max = mid - 1;
				} else {
					result = mid;
					break;
				}
			}
			if (chunks[result + 1] && chunks[result + 1][side].start.row <= row) {
				result++;
			}
			var range = chunks[result] && chunks[result][side];
			if (range && range.end.row > row) {
				return true;
			}
			return false;
		}
	}

	initTextInput(restore?: boolean) {
		if (restore) {
			// dangerous cast to remove readonly
			(this.otherEditor as RemoveReadonly<Editor>).textInput = this.othertextInput;
			(this.otherEditor as RemoveReadonly<Editor>).container = this.otherEditorContainer;
		} else {
			this.othertextInput = this.otherEditor.textInput;
			(this.otherEditor as RemoveReadonly<Editor>).textInput = this.activeEditor.textInput;
			this.otherEditorContainer = this.otherEditor.container;
			(this.otherEditor as RemoveReadonly<Editor>).container = this.activeEditor.container;
		}
	}

	selectEditor(editor: Editor) {
		if (editor == this.activeEditor) {
			this.otherEditor.selection.clearSelection();
			this.activeEditor.textInput.setHost(this.activeEditor);
			this.activeEditor.setStyle("ace_diff_other", false);
			this.cursorLayer.element.remove();
			this.activeEditor.renderer.$cursorLayer.element.style.visible = true;
			if (this.showSideA) {
				this.sessionA.removeMarker(this.syncSelectionMarkerA.id);
				this.sessionA.addDynamicMarker(this.syncSelectionMarkerA, true);
			}
			this.markerLayer.element.addClass("ace_hidden_marker-layer");
			this.activeEditor.renderer.$markerBack.element.removeClass("ace_hidden_marker-layer");
			this.removeBracketHighlight(this.otherEditor); 
		} else {
			this.activeEditor.selection.clearSelection();
			this.activeEditor.textInput.setHost(this.otherEditor);
			this.activeEditor.setStyle("ace_diff_other");
			this.activeEditor.renderer.$cursorLayer.element.parent!.append(
				this.cursorLayer.element
			);
			this.activeEditor.renderer.$cursorLayer.element.style.visible = false;
			if (this.activeEditor.$isFocused) {
				this.otherEditor.onFocus();
			}
			if (this.showSideA) {
				this.sessionA.removeMarker(this.syncSelectionMarkerA.id);
			}
			this.markerLayer.element.removeClass("ace_hidden_marker-layer");
			this.activeEditor.renderer.$markerBack.element.addClass("ace_hidden_marker-layer");
			this.removeBracketHighlight(this.activeEditor); 
		}
	}

	removeBracketHighlight(editor: Editor) {
		var session = editor.session;
		if (session.$bracketHighlight) {
			session.$bracketHighlight.markerIds.forEach(function(id) {
				session.removeMarker(id);
			});
			session.$bracketHighlight = void 0;
		}
	}

	initMouse() {
		this.otherEditor.renderer.$loop = this.activeEditor.renderer.$loop;

		// this.otherEditor.renderer.scroller = {
		// 	getBoundingClientRect: () => {
		// 		return this.activeEditor.renderer.scroller.getBoundingClientRect();
		// 	},
		// 	style: this.activeEditor.renderer.scroller.style,
		// };
		this.otherEditor.renderer.scroller = this.activeEditor.renderer.scroller;

		var forwardEvent = (type: string, ev: MouseEvent) => {
			if (!ev.domEvent) return; 
			var screenPos = ev.editor.renderer.pixelToScreenCoordinates(ev.x, ev.y);
			var sessionA = this.activeEditor.session;
			var sessionB = this.otherEditor.session;
			var posA = sessionA.screenToDocumentPosition(screenPos.row, screenPos.column, screenPos.offsetX); 
			var posB = sessionB.screenToDocumentPosition(screenPos.row, screenPos.column, screenPos.offsetX); 
		
			var posAx = sessionA.documentToScreenPosition(posA); 
			var posBx = sessionB.documentToScreenPosition(posB); 
			
			if (ev.editor == this.activeEditor) {
				if (posBx.row == screenPos.row && posAx.row != screenPos.row) {
					if (type == "mousedown") {
						this.selectEditor(this.otherEditor);
					}
					ev.propagationStopped = true;
					ev.defaultPrevented = true;
					this.otherEditor.$mouseHandler.onMouseEvent(type, ev.domEvent as UIMouseEvent);
				} else if (type == "mousedown") {
					this.selectEditor(this.activeEditor);
				}
			}
		};

		const events = {
			"mousedown": forwardEvent.bind(this, "mousedown"),
			"click": forwardEvent.bind(this, "click"),
			"mouseup": forwardEvent.bind(this, "mouseup"),
			"dblclick": forwardEvent.bind(this, "dblclick"),
			"tripleclick": forwardEvent.bind(this, "tripleclick"),
			"quadclick": forwardEvent.bind(this, "quadclick"),
		};
		Object.entries(events).forEach(([eventName, handler]) => {
			this.activeEditor.on(eventName as any, handler, true);
			this.activeEditor.on("gutter" + eventName as any, handler, true);
		});

		var onFocus = (e: UIEvent) => {
			this.activeEditor.onFocus(e);
		};
		var onBlur = (e: UIEvent) => {
			this.activeEditor.onBlur(e);
		};
		this.otherEditor.on("focus", onFocus);
		this.otherEditor.on("blur", onBlur);

		this.onMouseDetach = () => {
			Object.entries(events).forEach(([eventName, handler]) => {
				this.activeEditor.off(eventName as any, handler);
				this.activeEditor.off("gutter" + eventName as any, handler);
			});
			this.otherEditor.off("focus", onFocus);
			this.otherEditor.off("blur", onBlur);
		};
	}

	align() {
		var diffView = this;

		this.$initWidgets(diffView.editorA);
		this.$initWidgets(diffView.editorB);

		diffView.chunks.forEach(function (ch) {
			var diff1 = diffView.$screenRow(ch.old.end, diffView.sessionA)
				- diffView.$screenRow(ch.old.start, diffView.sessionA);
			var diff2 = diffView.$screenRow(ch.new.end, diffView.sessionB)
				- diffView.$screenRow(ch.new.start, diffView.sessionB);

			diffView.$addWidget(diffView.sessionA, {
				rowCount: diff2,
				rowsAbove: ch.old.end.row === 0 ? diff2 : 0,
				row: ch.old.end.row === 0 ? 0 : ch.old.end.row - 1
			});
			diffView.$addWidget(diffView.sessionB, {
				rowCount: diff1,
				rowsAbove: diff1,
				row: ch.new.start.row,
			});

		});
		diffView.sessionA["_emit"]("changeFold", {data: {start: {row: 0}}}, diffView.sessionA);
		diffView.sessionB["_emit"]("changeFold", {data: {start: {row: 0}}}, diffView.sessionB);
	}

	onChangeWrapLimit(e: any, session: EditSession) {
		this.otherSession.setOption("wrap", session.getOption("wrap"));
		this.otherSession.adjustWrapLimit(session.$wrapLimit);
		this.scheduleRealign();
		// todo, this is needed because editor.onChangeWrapMode
		// calls resize(true) instead of waiting for the renderloop
		this.activeEditor.renderer.updateFull();
	}

	$attachSessionsEventHandlers() {
		this.$attachSessionEventHandlers(this.editorA, this.markerA);
		this.$attachSessionEventHandlers(this.editorB, this.markerB);
		var session = this.activeEditor.session;
		session.on("changeWrapLimit", this.onChangeWrapLimit);
		session.on("changeWrapMode", this.onChangeWrapLimit);
	}

	$attachSessionEventHandlers(editor: Editor, marker: DiffHighlight) {
		editor.session.on("changeFold", this.onChangeFold);
		editor.session.addDynamicMarker(marker);
		editor.selection.on("changeCursor", this.onSelect);
		editor.selection.on("changeSelection", this.onSelect);
	}

	$detachSessionsEventHandlers() {
		this.$detachSessionHandlers(this.editorA, this.markerA);
		this.$detachSessionHandlers(this.editorB, this.markerB);
		this.otherSession.bgTokenizer.lines.fill(undefined);
		var session = this.activeEditor.session;
		session.off("changeWrapLimit", this.onChangeWrapLimit);
		session.off("changeWrapMode", this.onChangeWrapLimit);
	}

	$detachSessionHandlers(editor: Editor, marker: DiffHighlight) {
		editor.session.removeMarker(marker.id);
		editor.selection.off("changeCursor", this.onSelect);
		editor.selection.off("changeSelection", this.onSelect);
		editor.session.off("changeFold", this.onChangeFold);
	}

	$attachEventHandlers() {
		this.activeEditor.on("input", this.onInput);
		this.activeEditor.renderer.on("afterRender", this.onAfterRender);
		this.otherSession.on("change", this.onInput);
	}

	$detachEventHandlers() {
		this.$detachSessionsEventHandlers();
		this.activeEditor.off("input", this.onInput);
		this.activeEditor.renderer.off("afterRender", this.onAfterRender);
		this.otherSession.off("change", this.onInput);

		// this.textLayer.element.textContent = "";
		this.textLayer.element.remove();
		// this.gutterLayer.element.textContent = "";
		this.gutterLayer.element.remove();
		// this.markerLayer.element.textContent = "";
		this.markerLayer.element.remove();

		this.onMouseDetach();

		this.selectEditor(this.activeEditor);
		this.clearSelectionMarkers();
		// this.otherEditor.setSession(null);
		// @ts-ignore
		this.otherEditor.renderer.$loop = null; // break circular reference
		this.initTextInput(true);
		this.initRenderer(true);

		this.otherEditor.destroy();
	}

	/**
	 * @param {number} changes
	 * @param {import("ace-code").VirtualRenderer} renderer
	 */
	onAfterRender(changes: number, renderer: Renderer) {
		var config = renderer.layerConfig;

		var session = this.otherSession;
		var cloneRenderer = this.otherEditor.renderer;

		session.$scrollTop = renderer.scrollTop;
		session.$scrollLeft = renderer.scrollLeft;

		[
			"characterWidth",
			"lineHeight",
			"scrollTop",
			"scrollLeft",
			"scrollMargin",
			"$padding",
			"$size",
			"layerConfig",
			"$horizScroll",
			"$vScroll",
		]. forEach(function(prop) {
			// @ts-ignore
			cloneRenderer[prop] = renderer[prop];
		});

		cloneRenderer.$computeLayerConfig();

		var newConfig = cloneRenderer.layerConfig;
		
		this.gutterLayer.update(newConfig);

		newConfig.firstRowScreen = config.firstRowScreen;
		
		cloneRenderer.$cursorLayer.config = newConfig;
		cloneRenderer.$cursorLayer.update(newConfig);

		if (changes & cloneRenderer.CHANGE_LINES
			|| changes & cloneRenderer.CHANGE_FULL
			|| changes & cloneRenderer.CHANGE_SCROLL
			|| changes & cloneRenderer.CHANGE_TEXT
		)
			this.textLayer.update(newConfig);

		this.markerLayer.setMarkers(this.otherSession.getMarkers());
		this.markerLayer.update(newConfig);
	}

	detach() {
		super.detach();
		this.otherEditor && this.otherEditor.destroy();
	}
}
