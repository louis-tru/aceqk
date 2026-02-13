"use strict";

import type {IScrollBar, VScrollBar} from "../scrollbar";
import type {VirtualRenderer} from "../virtual_renderer";
import {Box} from "quark";
import type { Annotation } from "./gutter";

export interface Config {maxHeight?: number; lineHeight?: number; height?: number}

enum AnnotationType {
	info = 1,
	warning = 2,
	error = 3
}

export class Decorator {
	readonly renderer: VirtualRenderer;
	protected scrollbarV: IScrollBar;

	protected pixelRatio = 1;
	protected maxHeight: number;
	protected lineHeight: number;
	protected minDecorationHeight: number;
	protected halfMinDecorationHeight: number;

	protected container: Box;          // Box 容器
	protected zones: Box[] = [];       // annotation boxes

	public canvasWidth: number = 0;
	protected canvasHeight: number = 0;
	protected heightRatio: number = 1;
	protected oneZoneWidth: number = 0;

	public colors = {
		dark: {
			error:   "rgba(255, 18, 18, 1)",
			warning: "rgba(18, 136, 18, 1)",
			info:    "rgba(18, 18, 136, 1)",
			delete:  "",
			insert:  "",
		},
		light: {
			error:   "rgb(255,51,51)",
			warning: "rgb(32,133,72)",
			info:    "rgb(35,68,138)",
			delete:  "",
			insert:  "",
		}
	};

	constructor(scrollbarV: IScrollBar, renderer: VirtualRenderer) {
		this.renderer = renderer;
		this.maxHeight = renderer.layerConfig.maxHeight;
		this.lineHeight = renderer.layerConfig.lineHeight;
		this.minDecorationHeight = (2 * this.pixelRatio) | 0;
		this.halfMinDecorationHeight = (this.minDecorationHeight / 2) | 0;
		this.setScrollBarV(scrollbarV);
	}

	$createContainer() {
		this.container = new Box(this.renderer.window);
		this.container.style.layout = 'free';
		this.container.receive = false;
	}

	setScrollBarV(scrollbarV: IScrollBar) {
		this.$createContainer();
		this.scrollbarV = scrollbarV;
		scrollbarV.element.append(this.container);
		this.setDimensions();
	}

	$updateDecorators(config?: Config) {
		const colors: Record<string, string> = (this.renderer.theme.isDark === true)
			? this.colors.dark
			: this.colors.light;

		this.setDimensions(config);

		const pool = this.zones;   // 旧的当缓存池
		const used: Box[] = [];
		let idx = 0;

		const annotations = this.renderer.session.$annotations as
			(Annotation & { _mainType: string, priority: number })[];

		annotations.forEach(a => {
			let max = 0;
			if (Array.isArray(a.type)) {
				for (let t of a.type) {
					const p = AnnotationType[t as keyof typeof AnnotationType] || 0;
					if (p > max) max = p;
				}
			}
			a.priority = max;
			a._mainType = AnnotationType[max];
		});

		annotations.sort((a,b)=>a.priority-b.priority);

		for (let ann of annotations) {
			const row = ann.row;

			const offset1 = this.getVerticalOffsetForRow(row);
			const offset2 = offset1 + this.lineHeight;

			let y1 = Math.round(this.heightRatio * offset1);
			let y2 = Math.round(this.heightRatio * offset2);

			let ycenter = Math.round((y1 + y2) / 2);
			let halfHeight = (y2 - ycenter);

			if (halfHeight < this.halfMinDecorationHeight)
				halfHeight = this.halfMinDecorationHeight;

			if (ycenter - halfHeight < 0)
				ycenter = halfHeight;

			if (ycenter + halfHeight > this.canvasHeight)
				ycenter = this.canvasHeight - halfHeight;

			const from = ycenter - halfHeight;
			const zoneHeight = halfHeight * 2;
			const color = colors[ann._mainType] as `#${string}`;
			if (!color) continue;

			let box = pool[idx];

			if (!box) {
				box = new Box(this.renderer.window);
				box.receive = false;
				this.container.append(box);
				pool[idx] = box;
			}

			box.visible = true;
			box.marginTop = from;
			box.style.width = this.oneZoneWidth - 1;
			box.style.height = zoneHeight;
			box.style.backgroundColor = color;

			used.push(box);
			idx++;
		}

		// cursor line
		const cursor = this.renderer.session.selection.getCursor();
		if (cursor) {
			let currentY = Math.round(
				this.getVerticalOffsetForRow(cursor.row) * this.heightRatio
			);

			let line = pool[idx];
			if (!line) {
				line = new Box(this.renderer.window);
				line.receive = false;
				this.container.append(line);
				pool[idx] = line;
			}

			line.visible = true;
			line.marginTop = currentY;
			line.style.width = this.canvasWidth;
			line.style.height = 2;
			line.style.backgroundColor = "rgba(0,0,0,0.5)";

			used.push(line);
			idx++;
		}

		// 多余的隐藏
		for (let i = idx; i < pool.length; i++) {
			pool[i].visible = false;
		}

		this.zones = used;
	}

	getVerticalOffsetForRow(row: number): number {
		row = row | 0;
		return this.renderer.session.documentToScreenRow(row, 0) * this.lineHeight;
	}

	setDimensions(config?: Config) {
		config = config || this.renderer.layerConfig;

		this.maxHeight = config.maxHeight!;
		this.lineHeight = config.lineHeight!;
		this.canvasHeight = config.height!;
		this.canvasWidth = this.scrollbarV.width || this.canvasWidth;

		this.setZoneWidth();

		if (this.maxHeight < this.canvasHeight)
			this.heightRatio = 1;
		else
			this.heightRatio = this.canvasHeight / this.maxHeight;

		this.container.style.width  = this.canvasWidth;
		this.container.style.height = this.canvasHeight;
	}

	setZoneWidth() {
		this.oneZoneWidth = this.canvasWidth;
	}

	destroy() {
		for (let z of this.zones) z.remove();
		this.zones.length = 0;
		this.container?.remove();
	}
}