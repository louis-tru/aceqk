
import { Application,Window,Jsx, Text } from 'quark';
import * as ace from './src/ace';

const app = new Application();

// const win = new Window().render(
// 	<free width="match" height="match">
// 		<text value="Hello world" fontSize={48} align="centerMiddle" />
// 	</free>
// );

const dom = new Window().render(<text width="match" height="match" />);

const editor = ace.edit(dom as Text);

editor.session.setValue(`function hello() {
		console.log("Hello, world!");
}
hello();`);