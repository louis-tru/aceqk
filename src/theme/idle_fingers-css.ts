import * as dom from "../lib/dom";
dom.importCss({
".ace-idle-fingers .ace_gutter": {
	backgroundColor: "#3b3b3b",
	textColor:"rgb(153,153,153)",
},

".ace-idle-fingers .ace_print-margin": {
	width: 1,
	backgroundColor: "#3b3b3b",
},

".ace-idle-fingers": {
	backgroundColor: "#323232",
	textColor:"#FFFFFF",
},

".ace-idle-fingers .ace_cursor": {
	textColor:"#91FF00",
},

".ace-idle-fingers .ace_marker-layer .ace_selection": {
	backgroundColor: "rgba(90, 100, 126, 0.88)",
},

".ace-idle-fingers.ace_multiselect .ace_selection.ace_start": {
	boxShadow: "0 0 3 #323232",
},

".ace-idle-fingers .ace_marker-layer .ace_step": {
	backgroundColor: "rgb(102, 82, 0)",
},

".ace-idle-fingers .ace_marker-layer .ace_bracket": {
	margin: [-1, 0, 0, -1],
	border: "1 #404040",
},

".ace-idle-fingers .ace_marker-layer .ace_active-line": {
	backgroundColor: "#353637",
},

".ace-idle-fingers .ace_gutter-active-line": {
	backgroundColor: "#353637",
},

".ace-idle-fingers .ace_marker-layer .ace_selected-word": {
	border: "1 rgba(90, 100, 126, 0.88)",
},

".ace-idle-fingers .ace_invisible": {
	textColor:"#404040",
},

".ace-idle-fingers .ace_keyword,.ace-idle-fingers .ace_meta": {
	textColor:"#CC7833",
},

".ace-idle-fingers .ace_constant,\
.ace-idle-fingers .ace_constant.ace_character,\
.ace-idle-fingers .ace_constant.ace_character.ace_escape,\
.ace-idle-fingers .ace_constant.ace_other,\
.ace-idle-fingers .ace_support.ace_constant": {
	textColor:"#6C99BB",
},

".ace-idle-fingers .ace_invalid": {
	textColor: "#FFFFFF",
	backgroundColor: "#FF0000",
},

".ace-idle-fingers .ace_fold": {
	backgroundColor: "#CC7833",
	borderColor: "#FFFFFF",
},

".ace-idle-fingers .ace_support.ace_function": {
	textColor:"#B83426",
},

".ace-idle-fingers .ace_variable.ace_parameter": {
	fontSlant: "italic",
},

".ace-idle-fingers .ace_string": {
	textColor:"#A5C261",
},

".ace-idle-fingers .ace_string.ace_regexp": {
	textColor:"#CCCC33",
},

".ace-idle-fingers .ace_comment": {
	fontSlant: "italic",
	textColor:"#BC9458",
},

".ace-idle-fingers .ace_meta.ace_tag": {
	textColor:"#FFE5BB",
},

".ace-idle-fingers .ace_entity.ace_name": {
	textColor:"#FFC66D",
},

".ace-idle-fingers .ace_collab.ace_user1": {
	textColor: "#323232",
	backgroundColor: "#FFF980",
},

".ace-idle-fingers .ace_indent-guide": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWMwMjLyZYiPj/8PAAreAwAI1+g0AAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},

".ace-idle-fingers .ace_indent-guide-active": {
	background: "image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQIW2PQ1dX9zzBz5sz/ABCcBFFentLlAAAAAElFTkSuQmCC', 1 auto, x=end, repeatY)",
},
});
