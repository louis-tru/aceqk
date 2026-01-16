
import type {Tokenizer} from "../tokenizer";
import type { FoldMode } from "./folding/fold_mode";
import type {BehaviorAction, Behaviour} from "./behaviour";
import type {EditSession} from "../edit_session";
import type { Point, Range } from "../range";
import { Completion } from "../autocomplete";

export type HighlightRule = ({ defaultToken: string } | { include: string } | { todo: string } | {
	token: string | string[] | ((value: string) => string);
	regex: string | RegExp;
	next?: string | (() => void);
	push?: string;
	comment?: string;
	caseInsensitive?: boolean;
	nextState?: string;
}) & { [key: string]: any };

export type HighlightRulesMap = Record<string, HighlightRule[]>;

export type KeywordMapper = (keyword: string) => string;

export interface HighlightRules {
	$rules: HighlightRulesMap;
	$embeds: string[];
	$keywords: any[];
	$keywordList: string[];

	addRules(rules: HighlightRulesMap, prefix?: string): void;

	getRules(): HighlightRulesMap;

	embedRules(rules: (new () => HighlightRules) | HighlightRulesMap, prefix: string, escapeRules?: boolean, append?: boolean): void;

	getEmbeds(): string[];

	normalizeRules(): void;

	createKeywordMapper(map: Record<string, string>, defaultToken?: string, ignoreCase?: boolean, splitChar?: string): KeywordMapper;
}

export interface SyntaxMode {
	type?: string;
	$indentWithTabs?: boolean;
	$id: string;
	/**
	 * quotes used by language mode
	 */
	$quotes: { [quote: string]: string };
	HighlightRules: {
		new(config?: any): HighlightRules
	}; //TODO: fix this
	foldingRules?: FoldMode;
	$behaviour?: Behaviour;
	$defaultBehaviour?: Behaviour;
	/**
	 * characters that indicate the start of a line comment
	 */
	lineCommentStart?: string;
	/**
	 * characters that indicate the start and end of a block comment
	 */
	blockComment?: { start: string, end: string }
	tokenRe?: RegExp;
	nonTokenRe?: RegExp;
	/**
	 * An object containing conditions to determine whether to apply matching quote or not.
	 */
	$pairQuotesAfter: { [quote: string]: RegExp }
	$tokenizer: Tokenizer;
	$highlightRules: HighlightRules;
	$embeds?: string[];
	$modes?: SyntaxMode[];
	$keywordList?: string[];
	$highlightRuleConfig?: any;
	completionKeywords: string[];
	transformAction: BehaviorAction;
	path?: string;
	inlinePhp?: boolean;
	emmetConfig?: any;

	getMatching?: (session: EditSession, row?: number, column?: number, tokenRange?: Range) => any;

	getTokenizer(): Tokenizer;

	toggleCommentLines(state: string | string[],
							session: EditSession,
							startRow: number,
							endRow: number): void;

	toggleBlockComment(state: string | string[],
							session: EditSession,
							range: Range,
							cursor: Point): void;

	getNextLineIndent(state: string | string[], line: string, tab: string): string;

	checkOutdent(state: string | string[], line: string, input: string): boolean;

	autoOutdent(state: string | string[], doc: EditSession, row: number): void;

	// TODO implement WorkerClient types
	createWorker(session: EditSession): any;

	createModeDelegates(mapping: { [key: string]: string }): void;

	getKeywords(append?: boolean): Array<string | RegExp>;

	getCompletions(state: string | string[],
						session: EditSession,
						pos: Point,
						prefix: string): Completion[];

	$getIndent(line: string): string;

	$createKeywordList(): string[];

	$delegator(method: string, args: IArguments, defaultHandler: any): any;
}

export interface SyntaxModeConstructor {
	new(): SyntaxMode;
}

export type Modes = (
	'abap'|
	'abc'|
	'actionscript'|
	'ada'|
	'alda'|
	'apache_conf'|
	'apex'|
	'applescript'|
	'aql'|
	'asciidoc'|
	'asl'|
	'assembly_arm32'|
	'assembly_x86'|
	'astro'|
	'autohotkey'|
	'basic'|
	'batchfile'|
	'bibtex'|
	'c_cpp'|
	'c9search'|
	'cirru'|
	'clojure'|
	'clue'|
	'cobol'|
	'coffee'|
	'coldfusion'|
	'crystal'|
	'csharp'|
	'csound_document'|
	'csound_orchestra'|
	'csound_score'|
	'csp'|
	'css'|
	'csv'|
	'curly'|
	'cuttlefish'|
	'd'|
	'dart'|
	'diff'|
	'django'|
	'dockerfile'|
	'dot'|
	'drools'|
	'edifact'|
	'eiffel'|
	'ejs'|
	'elixir'|
	'elm'|
	'erlang'|
	'flix'|
	'forth'|
	'fortran'|
	'fsharp'|
	'fsl'|
	'ftl'|
	'gcode'|
	'gherkin'|
	'gitignore'|
	'glsl'|
	'gobstones'|
	'golang'|
	'graphqlschema'|
	'groovy'|
	'haml'|
	'handlebars'|
	'haskell_cabal'|
	'haskell'|
	'haxe'|
	'hjson'|
	'html_elixir'|
	'html'|
	'ini'|
	'io'|
	'ion'|
	'jack'|
	'jade'|
	'java'|
	'javascript'|
	'jexl'|
	'json'|
	'json5'|
	'jsp'|
	'jssm'|
	'jsx'|
	'julia'|
	'kotlin'|
	'latex'|
	'latte'|
	'less'|
	'liquid'|
	'lisp'|
	'livescript'|
	'logiql'|
	'logtalk'|
	'lsl'|
	'lua'|
	'luapage'|
	'lucene'|
	'makefile'|
	'markdown'|
	'mask'|
	'matlab'|
	'maze'|
	'mediawiki'|
	'mel'|
	'mips'|
	'mixal'|
	'mushcode'|
	'mysql'|
	'nasal'|
	'nginx'|
	'nim'|
	'nix'|
	'nsis'|
	'nunjucks'|
	'objectivec'|
	'ocaml'|
	'odin'|
	'partiql'|
	'pascal'|
	'perl'|
	'pgsql'|
	'php'|
	'pig'|
	'plain_text'|
	'plsql'|
	'powershell'|
	'praat'|
	'prisma'|
	'prolog'|
	'properties'|
	'protobuf'|
	'prql'|
	'puppet'|
	'python'|
	'qml'|
	'r'|
	'raku'|
	'razor'|
	'rdoc'|
	'red'|
	'redshift'|
	'rhtml'|
	'robot'|
	'rst'|
	'ruby_test'|
	'ruby'|
	'rust'|
	'sac'|
	'sass'|
	'scad'|
	'scala'|
	'scheme'|
	'scrypt'|
	'scss'|
	'sh'|
	'sjs'|
	'slim'|
	'smarty'|
	'smithy'|
	'soy_template'|
	'space'|
	'sparql'|
	'sql'|
	'sqlserver'|
	'stylus'|
	'svg'|
	'swift'|
	'tcl'|
	'terraform'|
	'tex'|
	'text'|
	'textile'|
	'toml'|
	'tsv'|
	'tsx'|
	'turtle'|
	'twig'|
	'typescript'|
	'vala'|
	'vbscript'|
	'velocity'|
	'verilog'|
	'vhdl'|
	'visualforce'|
	'vue'|
	'xml'|
	'yaml'|
	'zeek'|
	'zig'
);

export const TextMode: SyntaxModeConstructor = require("./text").Mode;

export function getMode(mode: Modes): SyntaxModeConstructor {
	const Mode = require(`./${mode}`).Mode;
	return Mode;
}