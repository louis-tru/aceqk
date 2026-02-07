
import * as dom from "../../lib/dom";

dom.importCss({
/*
 * Line Markers
 */
'.ace_diff': {
	// position: absolute;
	zIndex: 0,
},
'.ace_diff.inline': {
	zIndex: 20,
},
/*
 * Light Colors 
 */
'.ace_diff.insert': {
	backgroundColor: "#EFFFF1",
},
'.ace_diff.delete': {
	backgroundColor: "#FFF1F1",
},
'.ace_diff.aligned_diff': {
	backgroundColor: "rgba(206, 194, 191, 0.26)",
	// background: "repeating-linear-gradient(45deg, rgba(122, 111, 108, 0.26), rgba(122, 111, 108, 0.26) 5px, rgba(0, 0, 0, 0) 5px", rgba(0, 0, 0, 0) 10px)"
	background: "linear(45, rgba(122, 111, 108, 0.26) 0%, rgba(122, 111, 108, 0.26) 50%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0) 100%)",
},

'.ace_diff.insert.inline': {
	backgroundColor:  "rgba(74, 251, 74, 0.18)", 
},
'.ace_diff.delete.inline': {
	backgroundColor: "rgba(251, 74, 74, 0.15)",
},

'.ace_diff.delete.inline.empty': {
	backgroundColor: "rgba(255, 128, 79, 0.7)",
	width: 2,// !important;
},

'.ace_diff.insert.inline.empty': {
	backgroundColor: "rgba(49, 230, 96, 0.7)",
	width: 2,// !important;
},

'.ace_diff-active-line': {
	borderBottomWidth: 1,// solid
	borderTopWidth: 1,// solid
	backgroundColor: "#0000",
	// position: "absolute",
	// boxSizing: "border-box",
	borderColor: "#9191ac",
},

'.ace_dark .ace_diff-active-line': {
	backgroundColor: "#0000",
	borderColor: "#75777a",
},

/* gutter changes */
'.ace_mini-diff_gutter-enabled > .ace_gutter-cell,\
.ace_mini-diff_gutter-enabled > .ace_gutter-cell_svg-icons': {
	paddingRight: 13
},

'.ace_mini-diff_gutter_other > .ace_gutter-cell,\
.ace_mini-diff_gutter_other > .ace_gutter-cell_svg-icons': {
	visible: false, // display: none;
},

'.ace_mini-diff_gutter_other': {
	receive: false,
},

'.ace_mini-diff_gutter-enabled > .mini-diff-added': {
	backgroundColor: '#EFFFF1',
	borderLeft: '3 #2BB534',
	paddingLeft: 16,
	// display: 'block',
},

'.ace_mini-diff_gutter-enabled > .mini-diff-deleted': {
	backgroundColor: '#FFF1F1',
	borderLeft: '3 #EA7158',
	paddingLeft: 16,
	// display: 'block',
},

'.ace_mini-diff_gutter-enabled > .mini-diff-added:after': {
	// position: absolute;
	marginRight: 2,// right: 2px;
	// content: "+";
	// backgroundColor: inherit;
	align: "end",
},

'.ace_mini-diff_gutter-enabled > .mini-diff-deleted:after': {
	// position: absolute;
	marginRight: 2,// right: 2px;
	// content: "-";
	// backgroundColor: inherit;
	align: "end",
},

'.ace_fade-fold-widgets:hover > .ace_folding-enabled > .mini-diff-added:after,\
.ace_fade-fold-widgets:hover > .ace_folding-enabled > .mini-diff-deleted:after': {
	visible: false, // display: none;
},

'.ace_diff_other .ace_selection': {
	// filter: drop-shadow(1px 2px 3px darkgray);
},

'.ace_hidden_marker-layer .ace_bracket,\
.ace_hidden_marker-layer .ace_error_bracket': {
	visible: false, // display: none;
},

/*
 * Dark Colors 
 */

'.ace_dark .ace_diff.insert': {
	backgroundColor: '#212E25'
},
'.ace_dark .ace_diff.delete': {
	backgroundColor: '#3F2222'
},

'.ace_dark .ace_mini-diff_gutter-enabled > .mini-diff-added': {
	backgroundColor: '#212E25',
	borderLeftColor: '#00802F',
},

'.ace_dark .ace_mini-diff_gutter-enabled > .mini-diff-deleted': {
	backgroundColor: '#3F2222',
	borderLeftColor: '#9C3838',
}

}, "diffview.css");
