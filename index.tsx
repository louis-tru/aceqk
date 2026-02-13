
import { Application,Window,Jsx, Text } from 'quark';
import * as ace from './src/ace';
import {newRect} from 'quark/types';

const app = new Application();

const win = new Window({frame: newRect(0,0, 1000, 400)});
const dom = win.render(<text width="match" height="match" fontSize={12} />);
const editor = ace.edit(dom as Text);
editor.session.setMode('ace/mode/typescript');
editor.session.setTabSize(2);
// editor.session.setValue(`aa林`);
// editor.renderer.setOption("customScrollbar", true);

const code = `if (!isTextToken(token.type)) {
	let classes = "ace_" + token.type.replace(/\./g, " ace_");
	// let span = this.dom.createElement("span");
	let span: View;
	if (token.type == "fold") {
		// Use block view to allow setting width
		span = new TextView(this.element.window);
		span.style.height = '100%';
		span.style.width = (token.value.length * this.config.characterWidth);
		span.data.title = nls("inline-fold.closed.title", "Unfold code");
		valueFragment.forEach(e=>span.append(e));
	} else {
		if (valueFragment.length == 1) {
			span = valueFragment[0]; // avoid creating extra span
		} else {
			span = new Label(this.element.window);
			valueFragment.forEach(e=>span.append(e));
		}
	}
	span.class = classes.split(" ");
	parent.append(span);
}
else {
	valueFragment.forEach(function(child) {
		parent.append(child);
	});
}

`;

editor.session.setValue(code + code + code + code + code + code + code + code + code + code + code + code + code + code + code + code + code);

// new Window({frame: newRect(0,0, 1000, 400)}).render(
// 	// <text width="match" height="match" fontSize={12}>
// 		<box width="match" height={16} class="ace_line">
// 			<label class="ace_identifier" value="A">
// 				<box width={20} height={10} backgroundColor="#f004" />
// 			</label>
// 			<label class="ace_identifier" value="B">
// 				<box width={10} height={10} backgroundColor="#0f04" />
// 			</label>
// 		</box>
// 	// </text>
// );


win.onChange.on(()=>{
	editor.resize();
});

win.debugMode = true;