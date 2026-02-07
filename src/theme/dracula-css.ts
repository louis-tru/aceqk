import * as dom from "../lib/dom";
dom.importCss({
/*
 * Copyright © 2017 Zeno Rocha <hi@zenorocha.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

".ace-dracula .ace_gutter": {
	backgroundColor: "#282a36",
	textColor:"rgb(144,145,148)",
},

".ace-dracula .ace_print-margin": {
	width: 1,
	backgroundColor: "#44475a",
},

".ace-dracula": {
	backgroundColor: "#282a36",
	textColor:"#f8f8f2",
},

".ace-dracula .ace_cursor": {
	textColor:"#f8f8f0",
},

".ace-dracula .ace_marker-layer .ace_selection": {
	backgroundColor: "#44475a",
},

".ace-dracula.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #282a36",
	borderRadius: 2,
},

".ace-dracula .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(198, 219, 174)",
},

".ace-dracula .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #a29709",
},

".ace-dracula .ace_marker-layer .ace_active-line": {
	backgroundColor: "#44475a",
},

".ace-dracula .ace_gutter-active-line": {
	backgroundColor: "#44475a",
},

".ace-dracula .ace_marker-layer .ace_selected-word": {
	// boxShadow: "0 0 0 1 #a29709",
	borderRadius: 3,
},

".ace-dracula .ace_fold": {
	backgroundColor: "#50fa7b",
	borderColor: "#f8f8f2",
},

".ace-dracula .ace_keyword": {
	textColor:"#ff79c6",
},

".ace-dracula .ace_constant.ace_language": {
	textColor:"#bd93f9",
},

".ace-dracula .ace_constant.ace_numeric": {
	textColor:"#bd93f9",
},

".ace-dracula .ace_constant.ace_character": {
	textColor:"#bd93f9",
},

".ace-dracula .ace_constant.ace_character.ace_escape": {
	textColor:"#ff79c6",
},

".ace-dracula .ace_constant.ace_other": {
	textColor:"#bd93f9",
},

".ace-dracula .ace_support.ace_function": {
	textColor:"#8be9fd",
},

".ace-dracula .ace_support.ace_constant": {
	textColor:"#6be5fd",
},

".ace-dracula .ace_support.ace_class": {
	fontSlant: "italic",
	textColor:"#66d9ef",
},

".ace-dracula .ace_support.ace_type": {
	fontSlant: "italic",
	textColor:"#66d9ef",
},

".ace-dracula .ace_storage": {
	textColor:"#ff79c6",
},

".ace-dracula .ace_storage.ace_type": {
	fontSlant: "italic",
	textColor:"#8be9fd",
},

".ace-dracula .ace_invalid": {
	textColor: "#F8F8F0",
	backgroundColor: "#ff79c6",
},

".ace-dracula .ace_invalid.ace_deprecated": {
	textColor: "#F8F8F0",
	backgroundColor: "#bd93f9",
},

".ace-dracula .ace_string": {
	textColor:"#f1fa8c",
},

".ace-dracula .ace_comment": {
	textColor:"#6272a4",
},

".ace-dracula .ace_variable": {
	textColor:"#50fa7b",
},

".ace-dracula .ace_variable.ace_parameter": {
	fontSlant: "italic",
	textColor:"#ffb86c",
},

".ace-dracula .ace_entity.ace_other.ace_attribute-name": {
	textColor:"#50fa7b",
},

".ace-dracula .ace_entity.ace_name.ace_function": {
	textColor:"#50fa7b",
},

".ace-dracula .ace_entity.ace_name.ace_tag": {
	textColor:"#ff79c6",
},
".ace-dracula .ace_invisible": {
	textColor: "#626680",
},

".ace-dracula .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYHB3d/8PAAOIAdULw8qMAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-dracula .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACAQMAAACjTyRkAAAABlBMVEUAAADCwsK76u2xAAAAAXRSTlMAQObYZgAAAAxJREFUCNdjYGBoAAAAhACBGFbxzQAAAABJRU5ErkJggg==', 1 auto, x=end, repeatY)",
},
});
