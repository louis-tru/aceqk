import type { IScrollBar, VScrollBar } from "../../scrollbar";
import type {VirtualRenderer} from "../../virtual_renderer";
import type {EditSession} from "../../edit_session";
import {Decorator,Config} from "../../layer/decorators";
import {Box} from "quark";

export class ScrollDiffDecorator extends Decorator {
	public $zones: Array<{startRow: number; endRow: number; type: "delete" | "insert"}>;
	private $forInlineDiff: boolean;
	private sessionA!: EditSession;
	private sessionB!: EditSession;

	constructor(scrollbarV: IScrollBar, renderer: VirtualRenderer, forInlineDiff?: boolean) {
		super(scrollbarV, renderer);

		this.colors.dark["delete"] = "rgba(255, 18, 18, 1)";
		this.colors.dark["insert"] = "rgba(18, 136, 18, 1)";
		this.colors.light["delete"] = "rgb(255,51,51)";
		this.colors.light["insert"] = "rgb(32,133,72)";

		this.$zones = [];
		this.$forInlineDiff = !!forInlineDiff;
	}

	addZone(startRow: number, endRow: number, type: "delete" | "insert") {
		this.$zones.push({ startRow, endRow, type });
	}

	setSessions(sessionA: EditSession, sessionB: EditSession) {
		this.sessionA = sessionA;
		this.sessionB = sessionB;
	}

	$updateDecorators(config?: Config) {
		super.$updateDecorators(config);

		if (!this.$zones.length) {
			// 全部隐藏
			for (const b of this.zones)
				b.visible = false;
			return;
		}

		const colors = (this.renderer.theme.isDark === true)
			? this.colors.dark
			: this.colors.light;

		this.$setDiffDecorators(colors);
	}

	$setDiffDecorators(colors: Record<string, string>) {

		const resolved: {
			type: "delete" | "insert";
			from: number;
			to: number;
			color: string;
		}[] = [];

		const deleteZones = this.$zones.filter(z => z.type === "delete");
		const insertZones = this.$zones.filter(z => z.type === "insert");

		[deleteZones, insertZones].forEach(typeZones => {
			typeZones.forEach((zone, i) => {
				const offset1 = this.$transformPosition(zone.startRow, zone.type) * this.lineHeight;
				const offset2 = this.$transformPosition(zone.endRow, zone.type) * this.lineHeight + this.lineHeight;

				const y1 = Math.round(this.heightRatio * offset1);
				const y2 = Math.round(this.heightRatio * offset2);

				const padding = 1;

				let ycenter = Math.round((y1 + y2) / 2);
				let halfHeight = (y2 - ycenter);

				if (halfHeight < this.halfMinDecorationHeight)
					halfHeight = this.halfMinDecorationHeight;

				const prev = resolved[resolved.length - 1];

				if (i > 0 && prev && prev.type === zone.type && ycenter - halfHeight < prev.to + padding)
					ycenter = prev.to + padding + halfHeight;

				if (ycenter - halfHeight < 0)
					ycenter = halfHeight;

				if (ycenter + halfHeight > this.canvasHeight)
					ycenter = this.canvasHeight - halfHeight;

				resolved.push({
					type: zone.type,
					from: ycenter - halfHeight,
					to: ycenter + halfHeight,
					color: colors[zone.type] || ""
				});
			});
		});

		resolved.sort((a, b) => a.from - b.from);

		const pool = this.zones;
		let idx = 0;

		for (const zone of resolved) {
			if (!zone.color) continue;

			const zoneHeight = zone.to - zone.from;

			let box = pool[idx];
			if (!box) {
				box = new Box(this.renderer.window);
				box.receive = false;
				this.container.append(box);
				pool[idx] = box;
			}

			box.visible = true;
			box.marginTop = zone.from;
			box.style.height = zoneHeight;
			box.style.backgroundColor = zone.color as `#${string}`;

			if (this.$forInlineDiff) {
				box.marginLeft = this.oneZoneWidth;
				box.style.width = 2 * this.oneZoneWidth;
			} else {
				box.marginLeft = zone.type === "delete"
					? this.oneZoneWidth
					: 2 * this.oneZoneWidth;
				box.style.width = this.oneZoneWidth;
			}

			idx++;
		}

		// 多余的隐藏
		for (let i = idx; i < pool.length; i++) {
			pool[i].visible = false;
		}
	}
	$transformPosition(row: number, type: "delete" | "insert"): number {
		return type === "delete"
			? this.sessionA.documentToScreenRow(row, 0)
			: this.sessionB.documentToScreenRow(row, 0);
	}

	setZoneWidth() {
		this.oneZoneWidth = Math.round(this.canvasWidth / 3);
	}
}