/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2007, 2008 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

ZmMultiColView = function(parent, controller, dropTgt) {

	DwtComposite.call(this, {parent:parent, className:"ZmMultiColView", posStyle:Dwt.ABSOLUTE_STYLE});

	this._controller = controller;

	this._colIds = [];
	this._colDivs = [];
	this._listPart = [];
	this._colIndex = 0;
	this._currentListView = null;
	this._noOfCol = 0;
	this._cellCache = [];

	var folderTree = appCtxt.getFolderTree();
	if (folderTree) {
		folderTree.addChangeListener(new AjxListener(this, this._fileTreeListener));
	}

	this._initialize(controller, dropTgt);

	//override the default style set on DwtControl module
	var el = this.getHtmlElement();
	el.style.overflow = "";
}

ZmMultiColView.prototype = new DwtComposite;
ZmMultiColView.prototype.constructor = ZmMultiColView;

ZmMultiColView.prototype.toString = function() {
	return "ZmMultiColView";
};

// The next few funcs are passed to a component list view
ZmMultiColView.prototype.getTitle =
function() {
	return this._listPart[0].getTitle();
};

ZmMultiColView.prototype.processUploadFiles =
function() {
	return this._listPart[0].processUploadFiles();
};

ZmMultiColView.prototype.uploadFiles =
function() {
	return this._listPart[0].uploadFiles();
};

ZmMultiColView.prototype._fileTreeListener =
function(ev, treeView) {
	if (!this._rootFolder)
		return;

	var fields = ev.getDetail("fields");
	if (ev.event == ZmEvent.E_MODIFY && fields && fields[ZmOrganizer.F_COLOR]) {
		var organizers = ev.getDetail("organizers");
		if (!organizers && ev.source)
			organizers = [ev.source];

		for (var i = 0; i < organizers.length; i++) {
			var organizer = organizers[i];
			var folderId = this._rootFolder.isShared()
				? appCtxt.getById(this._rootFolder.folderId).id
				: this._rootFolder.folderId;

			if (organizer.id == folderId)
				this._setHeaderInfo();
		}
	}
};

ZmMultiColView.prototype._setHeaderInfo =
function(clear) {

};


ZmMultiColView.prototype._initialize =
function(controller, dropTgt) {
	var div = this.addColumn(dropTgt);
	this.setCurrentListView(this._listPart[0]);
};

ZmMultiColView.prototype.getListView =
function(idx) {
	return (idx >=0 )? this._listPart[idx] : this._listPart[0];
};


ZmMultiColView.prototype.addColumn =
function(dropTgt) {

	var idx = this._colIndex++;
	var divId = this._colIds[idx] = [ZmId.VIEW_BRIEFCASE_COLUMN, "col", idx].join(DwtId.SEP);

	var el = this.getHtmlElement();

	if (!this._table) {
		this._tableId = Dwt.getNextId();
		el.innerHTML = ['<table cellpadding=0 cellspacing=0 id="',this._tableId,'"><tbody><tr></tr></tbody></table>'].join("");
		this._table = document.getElementById(this._tableId);
		var tbody = this._table.tBodies[0];
		this._row = tbody.rows[0];
	}

	var div = this.getColumnDiv();
	div.id = this._colIds[idx];

	this._colDivs[idx] = div;
	var lv = new ZmColListView(this, this._controller, dropTgt, idx);
	this._listPart[idx] = lv;
	this._listPart[idx].reparentHtmlElement(this._colIds[idx]);

	// so that scroll event gets handed to lv (div is its parent element and gets the event)
	DwtControl.ALL_BY_ID[divId] = lv;

	return this._listPart[idx];
};

ZmMultiColView.prototype.removeColumn =
function(idx) {
	var div = this._colDivs[idx];
	if(div && div.parentNode) {
		this._noOfCol--;

		var cell = div.parentNode;
		cell.removeChild(div);

		if(this._row){
			this._row.deleteCell(cell.cellIndex);
		}

		if(this._listPart[idx] && this._listPart[idx] == this._currentListView) {
			this._currentListView = this._listPart[idx].getPreviousColumn();
		}
		delete this._colDivs[idx];
		delete this._listPart[idx];
	}
	return idx;
};

//todo: proper deletion logic
ZmMultiColView.prototype.removeChildColumns =
function(idx) {
	for(var i = idx+1;i<this._listPart.length;i++){
		this.removeColumn(i);
	}
	this.clearFolderProps();
};

ZmMultiColView.prototype.updateColumn =
function(colView,folderId) {

	if(colView != this._currentListView) return;

	for(var i=0;i<this._colIndex;i++){
		if(this._listPart[i]!=colView){
			this._listPart[i].set(folderId);
		}
	}
};

ZmMultiColView.prototype.setCurrentListView =
function(colView) {
	this._currentListView = colView;
};

ZmMultiColView.prototype.getCurrentListView =
function() {
	return this._currentListView;
};

ZmMultiColView.prototype.expandFolder =
function(folderId) {

	var listView  = this.addColumn();
	if(this._currentListView) {
		this._currentListView.setNextColumn(listView);
		listView.setPreviousColumn(this._currentListView);
	}
	this._currentListView = listView;
	this._controller._listView[ZmId.VIEW_BRIEFCASE_COLUMN] = listView;
	this._controller._refreshInProgress = true;
	this._controller._app.search(folderId);
};

ZmMultiColView.prototype.set =
function(list) {
	var len = this._listPart.length;
	var listView = null;
	if (len == 0){
		this._currentListView = listView = this.addColumn();
	} else {
		listView = this._currentListView;
		this.removeChildColumns(listView.getColumnIndex());
	}
	this._controller._listView[ZmId.VIEW_BRIEFCASE_COLUMN] = listView;
	listView.set(list);
};

ZmMultiColView.prototype.showFileProps =
function(item) {

	this.clearFolderProps();

	var el = this.getHtmlElement();

	var div = this.getColumnDiv();
	div.className = "ZmColListDiv  ZmColListDivPad";

	var contentType = item.contentType;
	if(contentType && contentType.match(/;/)) {
			contentType = contentType.split(";")[0];
	}
	var mimeInfo = contentType ? ZmMimeTable.getInfo(contentType) : null;
	var icon = "Img" + ( mimeInfo ? mimeInfo.imageLarge : "UnknownDoc_48");

	var briefcase = appCtxt.getById(item.folderId);
	var path = briefcase ? briefcase.getPath() : "";

	var name = item.name;
	if(name.length > 20){
		name = name.substring(0,20) + "..";
	}

	var restURL = item.getRestUrl();
	var originalRestURL = item.getRestUrl(false, true);

	// commented for bug 32457 :: restURL = this._controller.getApp().fixCrossDomainReference(restUrl);
	var fileLink = [ '<a href="', restURL, '" target="_blank">', name, '</a>' ].join("");

	var dateFormatter = AjxDateFormat.getDateTimeInstance(AjxDateFormat.FULL, AjxDateFormat.MEDIUM);

	var prop = [
		{name:ZmMsg.name, value:fileLink},
	];


    if(item.isRealFile() || item.isSlideDoc()){
        var actionLink;
        if(item.isSlideDoc()) {
            actionLink = [ '<a href="', originalRestURL, "?fmt=html&run=1", '" target="_blank">', ZmMsg.slides_launchSlideShow, '</a>' ].join("");
        }else{
            actionLink = [ '<a href="', originalRestURL, "?disp=a", '" target="_blank">', ZmMsg.saveFile, '</a>' ].join("");
        }
        prop.push({name:ZmMsg.action, value: actionLink});
    }

    prop = prop.concat([
        {name:ZmMsg.path, value:path},
		{name:ZmMsg.size, value:AjxUtil.formatSize(item.size)},
		{name:ZmMsg.created, value:dateFormatter.format(item.createDate)},
		{name:ZmMsg.creator, value:item.creator},
		{name:ZmMsg.modified, value:dateFormatter.format(item.modifyDate)},
		{name:ZmMsg.modifier, value:item.modifier}
    ]);

	var imgSrc = restURL.toLowerCase().match(/\.jpg$|\.gif$|\.jpeg$|\.bmp$$/) ? restURL : null;

	var subs = {
		imgSrc: imgSrc,
		icon: icon,
		previewId : Dwt.getNextId(),
		id : Dwt.getNextId(),
		fileProperties: prop
	};

    div.innerHTML = AjxTemplate.expand("briefcase.Briefcase#file_properties", subs);

	this._folderPropsDiv = div;

	this._controller.updateCurrentFolder(item.folderId);
	if(this._currentListView) {
		this._currentListView.setNextColumn(null);
	}

	this._sizeChildren();
	this.scrollToEnd();
};

ZmMultiColView.prototype.clearFolderProps =
function() {
	//clear the listener : if added
	if(this._folderPropsDiv){
		this._folderPropsDiv.parentNode.removeChild(this._folderPropsDiv);
		this._folderPropsDiv = null;
		this._noOfCol--;
	}
};

ZmMultiColView.prototype.getColumn =
function(folderId){
	for(var i in this._listPart){
		var listView = this._listPart[i];
		if(listView._folderId == folderId){
			return listView;
		}
	}
};

ZmMultiColView.prototype.setBounds =
function(x, y, width, height) {
	DwtComposite.prototype.setBounds.call(this, x, y, width, height);
	this._sizeChildren(width, height);
};


ZmMultiColView.prototype._sizeChildren =
function() {
	var size = Dwt.getSize(this.getHtmlElement());
	for(var i in this._colDivs){
		Dwt.setSize(this._colDivs[i],Dwt.DEFAULT,size.y);
	}
	for(var i in this._cellCache){
		Dwt.setSize(this._cellCache[i],Dwt.DEFAULT,size.y);
	}
	if(this._folderPropsDiv){
		Dwt.setSize(this._folderPropsDiv,Dwt.DEFAULT,size.y);
	}
};

ZmMultiColView.prototype.scrollToEnd =
function() {
	if(this._cellCache.length > 0) { return; }
	var el = this.getHtmlElement();
	el.scrollLeft = el.scrollWidth;
};

ZmMultiColView.prototype.getColumnDiv =
function() {

	if(!this._row) return;

	var size = Dwt.getSize(this.getHtmlElement());
	var limit = Math.max(Math.floor(size.x/250),4);

	if(this._noOfCol < limit){
		var neededCols = limit-this._noOfCol;
		for(var i=0;i<(neededCols);i++) {
			var div = this.createDiv();
			this._cellCache.push(div);
		}
		return this._cellCache.shift();

	}else if(this._cellCache.length > 0){
		return this._cellCache.shift();
	}else{
		var div = this.createDiv();
		return div;
	}
};

ZmMultiColView.prototype.createDiv =
function() {
	if(!this._row) return;
	var cell = this._row.insertCell(this._row.cells.length);
	cell.className = "ZmColListCell";
	var div = document.createElement("div");
	div.className = "ZmColListDiv";
	cell.appendChild(div);
	this._noOfCol++;
	return div;
};
