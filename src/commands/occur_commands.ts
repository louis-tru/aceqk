
import {Occur} from "../occur";
import {HashHandler,Command} from "../keyboard/hash_handler";
import type { Editor } from "../editor";

// These commands can be installed in a normal command handler to start occur:
export const occurStartCommand: Command = {
	name: "occur",
	exec: function(editor: Editor, options: any) {
		var alreadyInOccur = !!editor.session.$occur;
		var occurSessionActive = new Occur().enter(editor, options);
		if (occurSessionActive && !alreadyInOccur)
			OccurKeyboardHandler.installIn(editor);
	},
	readOnly: true
};

const occurCommands: Command[] = [{
	name: "occurexit",
	bindKey: 'esc|Ctrl-G',
	exec: function(editor) {
		var occur = editor.session.$occur;
		if (!occur) return;
		occur.exit(editor, {});
		if (!editor.session.$occur) OccurKeyboardHandler.uninstallFrom(editor);
	},
	readOnly: true
}, {
	name: "occuraccept",
	bindKey: 'enter',
	exec: function(editor: Editor) {
		var occur = editor.session.$occur;
		if (!occur) return;
		occur.exit(editor, {translatePosition: true});
		if (!editor.session.$occur) OccurKeyboardHandler.uninstallFrom(editor);
	},
	readOnly: true
}];

class OccurKeyboardHandler extends HashHandler {
	public isOccurHandler = true;
	private $editor: Editor;

	constructor(editor: Editor) {
		super();
		this.$editor = editor;
	}

	attach(editor: Editor) {
		HashHandler.call(this, occurCommands, editor.commands.platform);
		this.$editor = editor;
	};

	private handleKeyboard$super = this.handleKeyboard;

	handleKeyboard(data: any, hashId: number, key: string, keyCode: number): any {
		var cmd = this.handleKeyboard$super(data, hashId, key, keyCode);
		return (cmd && cmd.command) ? cmd : undefined;
	};

	static installIn(editor: Editor) {
		var handler = new this(editor);
		editor.keyBinding.addKeyboardHandler(handler);
		editor.commands.addCommands(occurCommands);
	};

	static uninstallFrom(editor: Editor) {
	editor.commands.removeCommands(occurCommands);
	var handler = editor.getKeyboardHandler() as OccurKeyboardHandler;
	if (handler.isOccurHandler)
		editor.keyBinding.removeKeyboardHandler(handler);
	};

}
