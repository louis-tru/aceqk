import * as dom from "../lib/dom";
dom.importCss({
".ace-merbivore-soft .ace_gutter": {
	backgroundColor: "#262424",
	textColor:"#E6E1DC",
},

".ace-merbivore-soft .ace_print-margin": {
	width: 1,
	backgroundColor: "#262424",
},

".ace-merbivore-soft": {
	backgroundColor: "#1C1C1C",
	textColor:"#E6E1DC",
},

".ace-merbivore-soft .ace_cursor": {
	textColor:"#FFFFFF",
},

".ace-merbivore-soft .ace_marker-layer .ace_selection": {
	backgroundColor: "#494949",
},

".ace-merbivore-soft.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #1C1C1C",
},

".ace-merbivore-soft .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-merbivore-soft .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #404040",
},

".ace-merbivore-soft .ace_marker-layer .ace_active-line": {
	backgroundColor: "#333435",
},

".ace-merbivore-soft .ace_gutter-active-line": {
	backgroundColor: "#333435",
},

".ace-merbivore-soft .ace_marker-layer .ace_selected-word": {
	border: "1 #494949",
},

".ace-merbivore-soft .ace_invisible": {
	textColor:"#404040",
},

".ace-merbivore-soft .ace_entity.ace_name.ace_tag,.ace-merbivore-soft .ace_keyword,.ace-merbivore-soft .ace_meta,.ace-merbivore-soft .ace_meta.ace_tag,.ace-merbivore-soft .ace_storage": {
	textColor:"#FC803A",
},

".ace-merbivore-soft .ace_constant,.ace-merbivore-soft .ace_constant.ace_character,.ace-merbivore-soft .ace_constant.ace_character.ace_escape,.ace-merbivore-soft .ace_constant.ace_other,.ace-merbivore-soft .ace_support.ace_type": {
	textColor:"#68C1D8",
},

".ace-merbivore-soft .ace_constant.ace_character.ace_escape": {
	textColor:"#B3E5B4",
},

".ace-merbivore-soft .ace_constant.ace_language": {
	textColor:"#E1C582",
},

".ace-merbivore-soft .ace_constant.ace_library,.ace-merbivore-soft .ace_string,.ace-merbivore-soft .ace_support.ace_constant": {
	textColor:"#8EC65F",
},

".ace-merbivore-soft .ace_constant.ace_numeric": {
	textColor:"#7FC578",
},

".ace-merbivore-soft .ace_invalid,.ace-merbivore-soft .ace_invalid.ace_deprecated": {
	textColor: "#FFFFFF",
	backgroundColor: "#FE3838",
},

".ace-merbivore-soft .ace_fold": {
	backgroundColor: "#FC803A",
	borderColor: "#E6E1DC",
},

".ace-merbivore-soft .ace_comment,.ace-merbivore-soft .ace_meta": {
	fontSlant: "italic",
	textColor:"#AC4BB8",
},

".ace-merbivore-soft .ace_entity.ace_other.ace_attribute-name": {
	textColor:"#EAF1A3",
},

".ace-merbivore-soft .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWOQkpLyZfD09PwPAAfYAnaStpHRAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-merbivore-soft .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
