"use strict";

import * as dom from "../lib/dom";
import {MouseEvent} from "./mouse_event";
import {HoverTooltip} from "../tooltip";
import {nls} from "../config";
import {Range} from "../range";
import type { MouseHandler } from "./mouse_handler";
import type {Editor} from "../editor";
import type {KeyEvent,MouseEvent as UIMouseEvent} from "quark/event";
import { View, Label, Text } from "quark";

type AnnotationMessages = {
	error: any[];
	security: any[];
	warning: any[];
	info: any[];
	hint: any[];
};

export class GutterHandler {
	/**
	 * @param {MouseHandler} mouseHandler
	 */
	constructor(mouseHandler: MouseHandler) {
		var editor = mouseHandler.editor;
		var gutter = editor.renderer.$gutterLayer;
		mouseHandler.$tooltip = new GutterTooltip(editor);
		mouseHandler.$tooltip.addToEditor(editor);

		mouseHandler.$tooltip.setDataProvider(function(e, editor: Editor) {
			var row = e.getDocumentPosition().row;
			mouseHandler.$tooltip!.showTooltip(row);
		});

		mouseHandler.editor.setDefaultHandler("guttermousedown", function(e) {
			if (!editor.isFocused() || e.getButton() != 0)
				return;
			var gutterRegion = gutter.getRegion(e);

			if (gutterRegion == "foldWidgets")
				return;

			var row = e.getDocumentPosition().row;
			var selection = editor.session.selection;

			if (e.getShiftKey())
				selection.selectTo(row, 0);
			else {
				if (e.detail == 2) {
					editor.selectAll();
					return e.preventDefault();
				}
				mouseHandler.$clickSelection = editor.selection.getLineRange(row);
			}
			mouseHandler.setState("selectByLines");
			mouseHandler.captureMouse(e);
			return e.preventDefault();
		});
	}
}

export class GutterTooltip extends HoverTooltip {
	static $uid: number = 0;
	private editor: Editor;
	private id: string;
	private visibleTooltipRow: number | undefined;

	/**
	 * @param {Editor} editor
	 */
	constructor(editor: Editor) {
		super(editor.container);
		this.id = "gt" + (++GutterTooltip.$uid);
		this.editor = editor;
		/**@type {Number | Undefined}*/
		this.visibleTooltipRow;
		var el = this.getElement();
		el.setAttribute("role", "tooltip");
		el.setAttribute("id", this.id);
		el.style.receive = true;
		this.idleTime = 50;

		this.onDomMouseMove = this.onDomMouseMove.bind(this);
		this.onDomMouseLeave = this.onDomMouseLeave.bind(this);

		this.setClassName("ace_gutter-tooltip");
	}

	onDomMouseMove(domEvent: UIMouseEvent) {
		var aceEvent = new MouseEvent(domEvent, this.editor);
		this.onMouseMove(aceEvent, this.editor);
	}
	
	onDomMouseLeave(domEvent: UIMouseEvent) {
		// var aceEvent = new MouseEvent(domEvent, this.editor);
		this.onMouseLeave(domEvent);
	}

	addToEditor(editor: Editor) {
		var gutter = editor.renderer.$gutter;
		gutter.addEventListener("MouseMove", this.onDomMouseMove);
		// gutter.addEventListener("mouseout", this.onDomMouseOut);
		gutter.addEventListener("MouseLeave", this.onDomMouseLeave);
		super.addToEditor(editor);
	}

	removeFromEditor(editor: Editor) {
		var gutter = editor.renderer.$gutter;
		gutter.removeEventListener("MouseMove", this.onDomMouseMove);
		gutter.removeEventListener("MouseLeave", this.onDomMouseLeave);
		super.removeFromEditor(editor);
	}

	destroy() {
		if (this.editor) {
			this.removeFromEditor(this.editor);
		}
		super.destroy();
	}

	static get annotationLabels() {
		return {
			error: {
				singular: nls("gutter-tooltip.aria-label.error.singular", "error"),
				plural: nls("gutter-tooltip.aria-label.error.plural", "errors")
			},
			security: {
				singular: nls("gutter-tooltip.aria-label.security.singular", "security finding"),
				plural: nls("gutter-tooltip.aria-label.security.plural", "security findings")
			},
			warning: {
				singular: nls("gutter-tooltip.aria-label.warning.singular", "warning"),
				plural: nls("gutter-tooltip.aria-label.warning.plural", "warnings")
			},
			info: {
				singular: nls("gutter-tooltip.aria-label.info.singular", "information message"),
				plural: nls("gutter-tooltip.aria-label.info.plural", "information messages")
			},
			hint: {
				singular: nls("gutter-tooltip.aria-label.hint.singular", "suggestion"),
				plural: nls("gutter-tooltip.aria-label.hint.plural", "suggestions")
			}
		};
	}

	/**
	 * @param {number} row
	 */
	showTooltip(row: number) {
		var gutter = this.editor.renderer.$gutterLayer;
		var annotationsInRow = gutter.$annotations[row];
		var annotation;

		if (annotationsInRow)
			annotation = {
				displayText: Array.from(annotationsInRow.displayText!||[]),
				type: Array.from(annotationsInRow.type)
			};
		else annotation = {displayText: [], type: []};

		// If the tooltip is for a row which has a closed fold, check whether there are
		// annotations in the folded lines. If so, add a summary to the list of annotations.
		var fold = gutter.session.getFoldLine(row);
		if (fold && gutter.$showFoldedAnnotations) {
			var annotationsInFold: AnnotationMessages = {
				error: [], security: [], warning: [], info: [], hint: []
			};
			var severityRank = {error: 1, security: 2, warning: 3, info: 4, hint: 5};
			var mostSevereAnnotationTypeInFold: string | undefined;

			for (var i = row + 1; i <= fold.end.row; i++) {
				const annotation = gutter.$annotations[i];
				if (!annotation) continue;

				for (var j = 0; j < annotation.text.length; j++) {
					var annotationType = annotation.type[j];
					annotationsInFold[annotationType as keyof typeof annotationsInFold].push(annotation.text[j]);
					if (
						!mostSevereAnnotationTypeInFold ||
						severityRank[annotationType as keyof typeof severityRank] < severityRank[mostSevereAnnotationTypeInFold as keyof typeof severityRank]
					) {
						mostSevereAnnotationTypeInFold = annotationType;
					}
				}
			}

			if (["error", "security", "warning"].includes(mostSevereAnnotationTypeInFold!)) {
				var summaryFoldedAnnotations = `${GutterTooltip.annotationsToSummaryString(
					annotationsInFold
				)} in folded code.`;

				annotation.displayText.push(summaryFoldedAnnotations);
				annotation.type.push(mostSevereAnnotationTypeInFold + "_fold");
			}
		}

		if (annotation.displayText.length === 0) return this.hide();

		var annotationMessages: AnnotationMessages = {error: [], security: [], warning: [], info: [], hint: []};
		var iconClassName = gutter.$useSvgGutterIcons ? "ace_icon_svg" : "ace_icon";

		// Construct the contents of the tooltip.
		for (var i = 0; i < annotation.displayText.length; i++) {
			// var lineElement = dom.createElement("span");
			var lineElement = new Label(this.window);

			// var iconElement = dom.createElement("span");
			var iconElement = new Label(this.window);
			iconElement.cssclass.set([`ace_${annotation.type[i]}`, iconClassName]);
			iconElement.setAttribute(
				"aria-label",
				`${GutterTooltip.annotationLabels[annotation.type[i].replace("_fold", "") as keyof typeof GutterTooltip.annotationLabels].singular}`
			);
			iconElement.setAttribute("role", "img");
			// Set empty content to the img span to get it to show up
			iconElement.append(dom.createTextNode(" ", this.window));

			lineElement.append(iconElement);
			lineElement.append(dom.createTextNode(annotation.displayText[i], this.window));
			lineElement.append(new Label(this.window));

			annotationMessages[annotation.type[i].replace("_fold", "") as keyof typeof annotationMessages].push(lineElement);
		}

		// var tooltipElement = dom.createElement("span");
		var tooltipElement = new Text(this.window);

		const appendText = (text: any) => {
			if (text instanceof View) {
				tooltipElement.append(text);
			} else {
				tooltipElement.append(dom.createTextNode(String(text), this.window));
			}
		}
		// Update the tooltip content
		annotationMessages.error.forEach(appendText);
		annotationMessages.security.forEach(appendText);
		annotationMessages.warning.forEach(appendText);
		annotationMessages.info.forEach(appendText);
		annotationMessages.hint.forEach(appendText);
		tooltipElement.setAttribute("aria-live", "polite");

		var annotationNode = this.$findLinkedAnnotationNode(row);
		if (annotationNode) {
			annotationNode.setAttribute("aria-describedby", this.id);
		}

		var range = Range.fromPoints({row, column: 0}, {row, column: 0});
		this.showForRange(this.editor, range, tooltipElement);
		this.visibleTooltipRow = row;
		this.editor._signal("showGutterTooltip", this, this.editor);
	}

	$setPosition(editor: Editor, _ignoredPosition: any, _withMarker: any, range: Range) {
		var gutterCell = this.$findCellByRow(range.start.row);
		if (!gutterCell) return;
		var el = gutterCell && gutterCell.element;
		var anchorEl = el && (el.querySelectorForClass(".ace_gutter_annotation"));
		if (!anchorEl) return;
		var pos = anchorEl.position;
		var size = anchorEl.clientSize;
		var r = {
			top: pos.y,
			right: pos.x + size.width,
		};
		var position = {
			pageX: r.right,
			pageY: r.top
		};
		//we don't need marker for gutter
		return super.$setPosition(editor, position, false, range);
	}

	$shouldPlaceAbove(labelHeight: number, anchorTop: number, spaceBelow: number) {
		return spaceBelow < labelHeight;
	}

	$findLinkedAnnotationNode(row: number) {
		var cell = this.$findCellByRow(row);
		if (cell) {
			var e = cell.element.first; // at 0
			if (!e) return;
			e = e.next; // at 1
			if (!e) return;
			e = e.next; // at 2
			// if (cell.element.childNodes.length > 2) {
			// 	return cell.element.childNodes[2];
			if (e) {
				return e; // the 3rd child
			}
		}
	}

	$findCellByRow(row: number) {
		return this.editor.renderer.$gutterLayer.$lines.cells.find((el) => el.row === row);
	}

	hide(e?: KeyEvent) {
		if(!this.isOpen){
			return;
		}
		this.$element!.removeAttribute("aria-live");

		if (this.visibleTooltipRow != undefined) {
			var annotationNode = this.$findLinkedAnnotationNode(this.visibleTooltipRow);
			if (annotationNode) {
				annotationNode.removeAttribute("aria-describedby");
			}
		}
		this.visibleTooltipRow = undefined;
		this.editor._signal("hideGutterTooltip", this, this.editor);
		super.hide(e);
	}

	static annotationsToSummaryString(annotations: {[key: string]: string[]}) {
		var summary = [];
		var annotationTypes = ["error", "security", "warning", "info", "hint"];
		for (var annotationType of annotationTypes) {
			if (!annotations[annotationType].length) continue;
			var label = annotations[annotationType].length === 1 ? 
				GutterTooltip.annotationLabels[annotationType as keyof typeof GutterTooltip.annotationLabels].singular : 
				GutterTooltip.annotationLabels[annotationType as keyof typeof GutterTooltip.annotationLabels].plural;
			summary.push(`${annotations[annotationType].length} ${label}`);
		}
		return summary.join(", ");
	}

	/**
	 * Check if cursor is outside gutter
	 * @param e
	 * @return {boolean}
	 */
	isOutsideOfText(e: MouseEvent) {
		var editor = e.editor;
		var pos = editor.renderer.$gutter.position;
		var size = editor.renderer.$gutter.clientSize;
		var rect = {
			left: pos.x,
			top: pos.y,
			right: pos.x + size.width,
			bottom: pos.y + size.height
		};
		return !(e.clientX >= rect.left && e.clientX <= rect.right &&
			   e.clientY >= rect.top && e.clientY <= rect.bottom);
	}
}
