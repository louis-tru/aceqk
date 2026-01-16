
import { DiffChunk } from "../base_diff_view";
import type {IDiffProvider} from "../../diff";

export declare class DiffProvider implements IDiffProvider {
	compute(originalLines: string[], modifiedLines: string[], opts?: any): DiffChunk[];
}