
import * as dom from "../lib/dom";

dom.importCss({

	/* -------------------------------------------------------------
	* Editor Search Form
	* ---------------------------------------------------------- */

	'.ace_search': {
		backgroundColor: '#ddd',
		textColor: '#666',
		borderColor: '#cbcbcb',
		borderWidth: 1,
		borderTopWidth: 0,
		// overflow: 'hidden',
		margin: 0,
		paddingTop: 4,
		paddingBottom: 0,
		paddingLeft: 4,
		paddingRight: 6,
		// position: 'absolute',
		// top: 0,
		zIndex: 99,
		whiteSpace: 'normal',
		cursor: 'default',
	},

	'.ace_search.left': {
		borderLeftWidth: 0,
		borderBottomRightRadius: 5,
		// left: 0,
	},

	'.ace_search.right': {
		borderRightWidth: 0,
		borderBottomLeftRadius: 5,
		// right: 0,
		align: 'end',
	},

	'.ace_search_form, .ace_replace_form': {
		marginTop: 0,
		marginBottom: 2,
		marginLeft: 0,
		marginRight: 20,
		// overflow: 'hidden',
		// lineHeight: 2.01, // 1.9
	},

	'.ace_replace_form': {
		marginRight: 0,
	},

	'.ace_search_form.ace_nomatch': {
		// outlineColor: 'red',
		// outlineWidth: 1,
	},

	/* -------------------------------------------------------------
	* Search input field
	* ---------------------------------------------------------- */

	'.ace_search_field': {
		borderTopLeftRadius: 3,
		borderBottomLeftRadius: 3,
		backgroundColor: '#fff',
		textColor: '#000',
		borderColor: '#cbcbcb',
		borderWidth: 1,
		borderRightWidth: 0,
		paddingLeft: 6,
		paddingRight: 6,
		paddingTop: 0,
		paddingBottom: 0,
		fontSize: 'inherit',
		margin: 0,
		lineHeight: 1, // 'inherit',
		// minWidth: '17em',
		// minHeight: '1.8em',
		// textVerticalAlign: 'top',
		// boxSizing: 'content-box',
	},

	/* -------------------------------------------------------------
	* Buttons
	* ---------------------------------------------------------- */

	'.ace_searchbtn': {
		borderColor: '#cbcbcb',
		borderWidth: 1,
		// lineHeight: 'inherit',
		// display: 'inline-block',
		paddingLeft: 6,
		paddingRight: 6,
		backgroundColor: '#fff',
		borderRightWidth: 0,
		borderLeftWidth: 0,
		// borderLeftColor: '#dcdcdc',
		cursor: 'pointer',
		margin: 0,
		marginLeft: 1,
		// position: 'relative',
		textColor: '#666',
		// height: '1.8em',
		lineHeight: 1,
	},

	// '.ace_searchbtn:last-child': {
	'.ace_searchbtn.last': {
		borderTopRightRadius: 3,
		borderBottomRightRadius: 3,
		borderRightWidth: 1,
	},
	// '.ace_searchbtn:disabled': {
	'.ace_searchbtn.disabled': {
		backgroundColor: '#0000',
		cursor: 'normal',
	},

	'.ace_searchbtn:hover': {
		backgroundColor: '#eef1f6',
	},

	'.ace_searchbtn:active': {
		backgroundColor: '#e9ecf1',
	},

	'.ace_searchbtn.prev, .ace_searchbtn.next': {
		// paddingLeft: '0.7em',
		// paddingRight:'0.7em',
		layout: 'free',
	},
	// '.ace_searchbtn.prev:after, .ace_searchbtn.next:after': {
	'.ace_searchbtn-prev-icon, .ace_searchbtn-next-icon': {
		// content: "";
		border: '2 #888',
		// width: '0.5em',
		// height: '0.5em',
		borderWidth:  [2, 0, 0, 2],
		// display:inline-block;
		rotateZ: -45,
		align: 'centerMiddle',
		receive: false,
	},
	// '.ace_searchbtn.next:after': {
	'.ace_searchbtn-next-icon': {
		borderWidth:  [0, 2, 2, 0],
	},
	/* -------------------------------------------------------------
	* Close button
	* ---------------------------------------------------------- */

	'.ace_searchbtn_close': {
		background: 'image("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAcCAYAAABRVo5BAAAAZ0lEQVR42u2SUQrAMAhDvazn8OjZBilCkYVVxiis8H4CT0VrAJb4WHT3C5xU2a2IQZXJjiQIRMdkEoJ5Q2yMqpfDIo+XY4k6h+YXOyKqTIj5REaxloNAd0xiKmAtsTHqW8sR2W5f7gCu5nWFUpVjZwAAAABJRU5ErkJggg==", 100%, no-repeat)',
		borderRadius: 7,
		borderWidth: 0,
		textColor: '#656565',
		cursor: 'pointer',
		fontSize: 16,
		padding: 0,
		width: 14,
		height: 14,
		marginTop: 5,
		marginRight: 1,
		align: 'end',
		// position: 'absolute',
		backgroundColor: '#0000',
	},

	'.ace_searchbtn_close:hover': {
		background: 'image("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAcCAYAAABRVo5BAAAAZ0lEQVR42u2SUQrAMAhDvazn8OjZBilCkYVVxiis8H4CT0VrAJb4WHT3C5xU2a2IQZXJjiQIRMdkEoJ5Q2yMqpfDIo+XY4k6h+YXOyKqTIj5REaxloNAd0xiKmAtsTHqW8sR2W5f7gCu5nWFUpVjZwAAAABJRU5ErkJggg==", 100%, no-repeat, y=100%)',
		backgroundColor: '#656565',
		textColor: '#fff',
	},

	/* -------------------------------------------------------------
	* Generic buttons
	* ---------------------------------------------------------- */

	'.ace_button': {
		marginLeft: 2,
		cursor: 'pointer',
		// overflow: 'hidden',
		opacity: 0.7,
		borderColor: 'rgba(100,100,100,0.23)',
		borderWidth: 1,
		padding: 1,
		// boxSizing: 'borderBox',
		textColor: '#000',
		align: 'end',
	},

	'.ace_button.left': {
		align: 'start',
	},

	'.ace_button:hover': {
		backgroundColor: '#eee',
		opacity: 1,
	},

	'.ace_button:active': {
		backgroundColor: '#ddd',
	},

	'.ace_button.checked': {
		borderColor: '#3399ff',
		opacity: 1,
	},

	/* -------------------------------------------------------------
	* Search options & counter
	* ---------------------------------------------------------- */

	'.ace_search_options': {
		marginBottom: 2,
		textAlign: 'right',
		// clear: 'both',
	},

	'.ace_search_counter': {
		// float: 'left',
		fontFamily: 'Arial',
		paddingLeft: 8,
		paddingRight: 8,
	},

}, "ace_searchbox", false);