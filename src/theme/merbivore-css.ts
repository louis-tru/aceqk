import * as dom from "../lib/dom";
dom.importCss({
".ace-merbivore .ace_gutter": {
	backgroundColor: "#202020",
	textColor:"#E6E1DC",
},

".ace-merbivore .ace_print-margin": {
	width: 1,
	backgroundColor: "#555651",
},

".ace-merbivore": {
	backgroundColor: "#161616",
	textColor:"#E6E1DC",
},

".ace-merbivore .ace_cursor": {
	textColor:"#FFFFFF",
},

".ace-merbivore .ace_marker-layer .ace_selection": {
	backgroundColor: "#454545",
},

".ace-merbivore.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #161616",
},

".ace-merbivore .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-merbivore .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #404040",
},

".ace-merbivore .ace_marker-layer .ace_active-line": {
	backgroundColor: "#333435",
},

".ace-merbivore .ace_gutter-active-line": {
	backgroundColor: "#333435",
},

".ace-merbivore .ace_marker-layer .ace_selected-word": {
	border: "1 #454545",
},

".ace-merbivore .ace_invisible": {
	textColor:"#404040",
},

".ace-merbivore .ace_entity.ace_name.ace_tag,.ace-merbivore .ace_keyword,.ace-merbivore .ace_meta,.ace-merbivore .ace_meta.ace_tag,.ace-merbivore .ace_storage,.ace-merbivore .ace_support.ace_function": {
	textColor:"#FC6F09",
},

".ace-merbivore .ace_constant,.ace-merbivore .ace_constant.ace_character,.ace-merbivore .ace_constant.ace_character.ace_escape,.ace-merbivore .ace_constant.ace_other,.ace-merbivore .ace_support.ace_type": {
	textColor:"#1EDAFB",
},

".ace-merbivore .ace_constant.ace_character.ace_escape": {
	textColor:"#519F50",
},

".ace-merbivore .ace_constant.ace_language": {
	textColor:"#FDC251",
},

".ace-merbivore .ace_constant.ace_library,.ace-merbivore .ace_string,.ace-merbivore .ace_support.ace_constant": {
	textColor:"#8DFF0A",
},

".ace-merbivore .ace_constant.ace_numeric": {
	textColor:"#58C554",
},

".ace-merbivore .ace_invalid": {
	textColor: "#FFFFFF",
	backgroundColor: "#990000",
},

".ace-merbivore .ace_fold": {
	backgroundColor: "#FC6F09",
	borderColor: "#E6E1DC",
},

".ace-merbivore .ace_comment": {
	fontSlant: "italic",
	textColor:"#AD2EA4",
},

".ace-merbivore .ace_entity.ace_other.ace_attribute-name": {
	textColor:"#FFFF89",
},

".ace-merbivore .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWMQFxf3ZXB1df0PAAdsAmERTkEHAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-merbivore .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
