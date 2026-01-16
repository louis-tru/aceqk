
export declare namespace Ace {
	type BracketMatch = import("./src/edit_session/bracket_match").BracketMatch;
	type Folding = import("./src/edit_session/folding").Folding;
	type Anchor = import("./src/anchor").Anchor;
	type Editor = import("./src/editor").Editor;
	type EditSession = import("./src/edit_session").EditSession;
	type Document = import("./src/document").Document;
	type Fold = import("./src/edit_session/fold").Fold;
	type FoldLine = import("./src/edit_session/fold_line").FoldLine;
	type Range = import("./src/range").Range;
	type VirtualRenderer = import("./src/virtual_renderer").VirtualRenderer;
	type UndoManager = import("./src/undomanager").UndoManager;
	type Tokenizer = import("./src/tokenizer").Tokenizer;
	type TokenIterator = import("./src/token_iterator").TokenIterator;
	type Selection = import("./src/selection").Selection;
	type Autocomplete = import("./src/autocomplete").Autocomplete;
	type InlineAutocomplete = import("./src/ext/inline_autocomplete").InlineAutocomplete;
	type CompletionProvider = import("./src/autocomplete").CompletionProvider;
	type AcePopup = import("./src/autocomplete/popup").AcePopup;
	type AceInline = import("./src/autocomplete/inline").AceInline;
	type MouseEvent = import("./src/mouse/mouse_event").MouseEvent;
	type RangeList = import("./src/range_list").RangeList;
	type FilteredList = import("./src/autocomplete").FilteredList;
	type LineWidgets = import("./src/line_widgets").LineWidgets;
	type SearchBox = import("./src/ext/searchbox").SearchBox;
	type Occur = import("./src/occur").Occur;
	type DefaultHandlers = import("./src/mouse/default_handlers").DefaultHandlers;
	type GutterHandler = import("./src/mouse/default_gutter_handler").GutterHandler;
	type DragdropHandler = import("./src/mouse/dragdrop_handler").DragdropHandler;
	type AppConfig = import("./src/lib/app_config").AppConfig;
	type Config = typeof import("./src/config");
	type GutterTooltip = import( "./src/mouse/default_gutter_handler").GutterTooltip;
	type GutterKeyboardEvent = import( "./src/keyboard/gutter_handler").GutterKeyboardEvent;
	type HoverTooltip = import("./src/tooltip").HoverTooltip;
	type Tooltip = import("./src/tooltip").Tooltip;
	type TextInput = import("./src/keyboard/textinput").TextInput;
	type DiffChunk = import("./src/ext/diff/base_diff_view").DiffChunk;

	type AfterLoadCallback = (err: Error | null, module: unknown) => void;
	type LoaderFunction = (moduleName: string, afterLoad: AfterLoadCallback) => void;

	type ConfigOptions = import("./src/config").ConfigOptions;

	interface Theme {
		cssClass?: string;
		cssText?: string;
		$id?: string;
		padding?: number;
		isDark?: boolean;
		$showGutterCursorMarker?: boolean;
	}

	interface ScrollBar {
		setVisible(visible: boolean): void;

		[key: string]: any;
	}

	interface HScrollbar extends ScrollBar {
		setWidth(width: number): void;
	}

	interface VScrollbar extends ScrollBar {
		setHeight(width: number): void;
	}

	type LayerConfig = import("./src/layer/lines").LayerConfig;

	interface CommandBarOptions {
		maxElementsOnTooltip: number;
		alwaysShow: boolean;
		showDelay: number;
		hideDelay: number;
	}

	type IRange = import("./src/range").IRange;

	type NewLineMode = import("./src/document").NewLineMode;

	type EditSessionEvents = import("./src/edit_session").EditSessionEvents;
	type EditorEvents = import("./src/editor").EditorEvents;

	type DocumentEvents = import("./src/document").DocumentEvents;

	type AnchorEvents = import("./src/anchor").AnchorEvents;

	type BackgroundTokenizerEvents = import("./src/background_tokenizer").BackgroundTokenizerEvents;
	type BackgroundTokenizer = import("./src/background_tokenizer").BackgroundTokenizer;

	type EventEmitter<T extends { [K in keyof T]: (...args: any[]) => any }> = import("./src/lib/event_emitter").EventEmitter<T>;

	type Point = import("./src/range").Point;
	type Delta = import("./src/range").Delta;

	type MarkerGroup = import("./src/marker_group").MarkerGroup;
	type BaseCompletion = import("./src/autocomplete").BaseCompletion;
	type SnippetCompletion = import("./src/autocomplete").SnippetCompletion;
	type ValueCompletion = import("./src/autocomplete").ValueCompletion;
	type Completion = import("./src/autocomplete").Completion;
	type CompleterCallback = import("./src/autocomplete").CompleterCallback;
	type Completer = import("./src/autocomplete").Completer;
	type CompletionOptions = import("./src/autocomplete").CompletionOptions;
	type CompletionProviderOptions = import("./src/autocomplete").CompletionProviderOptions;
	type GatherCompletionRecord = import("./src/autocomplete").GatherCompletionRecord;
	type CompletionCallbackFunction = import("./src/autocomplete").CompletionCallbackFunction;
	type CompletionProviderCallback = import("./src/autocomplete").CompletionProviderCallback;
	type AcePopupNavigation = import("./src/autocomplete").AcePopupNavigation;
	type FoldMode = import("./src/mode/folding/fold_mode").FoldMode;
	type SyntaxMode = import("./src/mode").SyntaxMode;
	type Command = import("./src/keyboard/hash_handler").Command;

	interface Outdent {
		checkOutdent(line: string, input: string): boolean;

		autoOutdent(doc: Document, row: number): number | undefined;
	}

	interface OptionsBase {
		[key: string]: any;
	}

	type OptionsProvider<T> = import("./src/lib/app_config").OptionsProvider<T>;

	type KeyBinding = import("./src/keyboard/keybinding").KeyBinding;

	interface CommandMap {
		[name: string]: Command;
	}

	type CommandManager = import("./src/commands/command_manager").CommandManager;

	type InlineAutocompleteAction = import("./src/autocomplete").InlineAutocompleteAction;

	export type CommandBarTooltip = import("./src/ext/command_bar").CommandBarTooltip;

	export type TokenizeResult = Array<Array<{
		className?: string,
		value: string,
	}>>

	export interface StaticHighlightOptions {
		/** Syntax mode (e.g., 'ace/mode/javascript'). Auto-detected from CSS class if not provided */
		mode?: string | SyntaxMode,
		/** Color theme (e.g., 'ace/theme/textmate'). Defaults to 'ace/theme/textmate' */
		theme?: string | Theme,
		/** Whether to trim whitespace from code content */
		trim?: boolean,
		/** Starting line number for display */
		firstLineNumber?: number,
		/** Whether to show line numbers gutter */
		showGutter?: boolean
	}

	export interface CommandBarEvents {
		"hide": (e: undefined, emitter: import("./src/ext/command_bar").CommandBarTooltip) => void;
		"show": (e: undefined, emitter: import("./src/ext/command_bar").CommandBarTooltip) => void;
		"alwaysShow": (e: boolean, emitter: import("./src/ext/command_bar").CommandBarTooltip) => void;
	}

	export interface OptionPanelEvents {
		"setOption": (e: { name: string, value: any }, emitter: import("./src/ext/options").OptionPanel) => void;
	}

	export interface ScrollbarEvents {
		"scroll": (e: { data: number }, emitter: ScrollBar) => void;
	}

	type EditorOptions = import("./src/editor").EditorOptions;
}

declare module "./src/ext/options" {
	export interface OptionPanel extends Ace.EventEmitter<Ace.OptionPanelEvents> {
	}
}