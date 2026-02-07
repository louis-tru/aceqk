import * as dom from "../lib/dom";
dom.importCss({
".ace-monokai .ace_gutter": {
	backgroundColor: "#2F3129",
	textColor:"#8F908A",
},

".ace-monokai .ace_print-margin": {
	width: 1,
	backgroundColor: "#555651",
},

".ace-monokai": {
	backgroundColor: "#272822",
	textColor:"#F8F8F2",
},

".ace-monokai .ace_cursor": {
	textColor:"#F8F8F0",
},

".ace-monokai .ace_marker-layer .ace_selection": {
	backgroundColor: "#49483E",
},

".ace-monokai.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #272822",
},

".ace-monokai .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-monokai .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #49483E",
},

".ace-monokai .ace_marker-layer .ace_active-line": {
	backgroundColor: "#202020",
},

".ace-monokai .ace_gutter-active-line": {
	backgroundColor: "#272727",
},

".ace-monokai .ace_marker-layer .ace_selected-word": {
	border: "1 #49483E",
},

".ace-monokai .ace_invisible": {
	textColor:"#52524d",
},

".ace-monokai .ace_entity.ace_name.ace_tag,.ace-monokai .ace_keyword,.ace-monokai .ace_meta.ace_tag,.ace-monokai .ace_storage": {
	textColor:"#F92672",
},

".ace-monokai .ace_punctuation,.ace-monokai .ace_punctuation.ace_tag": {
	textColor:"#fff",
},

".ace-monokai .ace_constant.ace_character,.ace-monokai .ace_constant.ace_language,.ace-monokai .ace_constant.ace_numeric,.ace-monokai .ace_constant.ace_other": {
	textColor:"#AE81FF",
},

".ace-monokai .ace_invalid": {
	textColor: "#F8F8F0",
	backgroundColor: "#F92672",
},

".ace-monokai .ace_invalid.ace_deprecated": {
	textColor: "#F8F8F0",
	backgroundColor: "#AE81FF",
},

".ace-monokai .ace_support.ace_constant,.ace-monokai .ace_support.ace_function": {
	textColor:"#66D9EF",
},

".ace-monokai .ace_fold": {
	backgroundColor: "#A6E22E",
	borderColor: "#F8F8F2",
},

".ace-monokai .ace_storage.ace_type,.ace-monokai .ace_support.ace_class,.ace-monokai .ace_support.ace_type": {
	fontSlant: "italic",
	textColor:"#66D9EF",
},

".ace-monokai .ace_entity.ace_name.ace_function,.ace-monokai .ace_entity.ace_other,.ace-monokai .ace_entity.ace_other.ace_attribute-name,.ace-monokai .ace_variable": {
	textColor:"#A6E22E",
},

".ace-monokai .ace_variable.ace_parameter": {
	fontSlant: "italic",
	textColor:"#FD971F",
},

".ace-monokai .ace_string": {
	textColor:"#E6DB74",
},

".ace-monokai .ace_comment": {
	textColor:"#75715E",
},

".ace-monokai .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWPQ0FD0ZXBzd/wPAAjVAoxeSgNeAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-monokai .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
