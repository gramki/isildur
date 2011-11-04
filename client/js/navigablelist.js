/*
 *
 * Depends on:
 * 		jquery.ui.sortable
 */
 (function() {
    var _create_count = 0;

    $.widget("ui.navigablelist", {
        options: {
            leftList: null,
            rightList: null,
            topList: null,
            bottomList: null,
			shouldCopy: false
        },
        _setOption: function(key, value) {
            var list;
			switch(key){
				case 'leftList':
				case 'rightList':
				case 'bottomList':
				case 'topList':
					list = $(value).data('navigablelist');
					if(list === this){
						console.error('attempt to set a list ' + key + ' as itself', list);
						return;
					}
					this[key] = list;
					return;
					break;
			}
			this[key] = value;
        },
        _create: function() {
            console.log("navigablelist _create called: " + (++_create_count), this.element);
            $(this.element).addClass('navigable-list');
            $(this.element).sortable({
                connectWith: ".navigable-list"
            }).disableSelection();
            $(this.element).bind('sortstart', this._onBeforeDrag);
            $(this.element).bind('sortstop', this._onDrop);
            $(this.element).bind('sortover',
            function(ev, ui) {
                $(this).addClass('droptraget');
            });
            $(this.element).bind('sortout',
            function(ev, ui) {
                $(this).removeClass('droptraget');
            });

            this.element.keydown(this._onKey);
            this.element.children().attr('tabindex', -1);

            var instance = this;
            this.element.click(function(e) {
                if (e.target == instance.element[0]) {
                    return;
                }
                instance.activeElement = e.target;
                instance._toggleSelectActiveElement();
                $(e).focus();
            });
            this.element.dblclick(function(e) {
                instance._clearSelection();
            });
            this.element.children().mouseover(function(e) {
                instance._setActiveElement(this);
            });
            this.element.children().mouseout(function(e) {
                instance._setActiveElement(null);
            });
        },
        _setActiveElement: function(element) {
            if (element) {
                this.activeElement = $(element);
                this.activeElement.focus();
            } else {
                this.activeElement = null;
            }
        },
        _focusPrevious: function() {
            if (!this.activeElement) {
                return;
            }
            var prev = $(this.activeElement).prev();
            if (!prev.length) {
                return;
            }
            prev = prev[0];
            console.log("Setting focus to", prev);
            this._setActiveElement(prev);
        },
        _focusNext: function() {
            if (!this.activeElement) {
                return;
            }
            var next = $(this.activeElement).next();
            if (!next.length) {
                return;
            }
            next = next[0];
            console.log("Setting focus to", next);
            this._setActiveElement(next);
        },
        _toggleSelectActiveElement: function() {
            var cname = 'ui-selected';
            if ($(this.activeElement).hasClass(cname)) {
                $(this.activeElement).removeClass(cname);
            } else {
                $(this.activeElement).addClass(cname);
            }
        },
        _selectAll: function() {
            $(this.element).children().addClass('ui-selected');
        },
        _clearSelection: function() {
            $('.ui-selected', this.element).removeClass('ui-selected');
        },
        _moveUp: function(elements) {
            //Move elements before the previous elements, except when the previous element
            //is in the set of elements being moved.
            $.each(elements,
            function(index, element) {
                console.log(element, " index: " + index);
                var prev = $(element).prev();
                if (!prev.length) {
                    return;
                }
                if ($.inArray(prev[0], elements) !== -1) {
                    return;
                }
                $(element).insertBefore(prev[0]);
            });
        },
        _moveDown: function(elements) {
            if (! (elements instanceof Array)) {
                if (elements.toArray instanceof Function) {
                    elements = elements.toArray();
                } else {
                    return;
                }
            }
            elements = elements.reverse();
            $.each(elements,
            function(index, element) {
                var next = $(element).next();
                if (!next.length) {
                    return;
                }
                if ($.inArray(next[0], elements) !== -1) {
                    return;
                }
                $(element).insertAfter(next[0]);
            });
        },
        _moveTo: function(targetList, before) {
            if (!targetList) {
                return;
            }
            var elements = this._selectedElements();
            if (!elements.length) {
                return;
            }
			var copy = this.shouldCopy?true:false;
			console.log(copy?'Copying':'Moving ', elements, ' to ', targetList.element);
			var ch = targetList.element.children();
			if (!ch.length) {
				$(targetList.element).append('<li id="navigablelist-temp"></li>');
				ch = targetList.element.children();
			}
            var refElement = targetList.activeElement || (before?ch[0]:ch[ch.length-1]);
			if(!before){
				elements = elements.toArray().reverse();
			}
			console.log('Reference Element', refElement);
			
			$.each(elements, function(index, el){
				if(copy){
					before?$(el).clone().insertBefore(refElement):$(el).clone().insertAfter(refElement);					
				}else{
					before?$(el).insertBefore(refElement):$(el).insertAfter(refElement);					
				}
			});
			
			$('#navigablelist-temp').remove();
			this._setActiveElement(null);
			targetList._setActiveElement(before?elements[0]:elements[elements.length-1]);
        },
        _onBeforeDrag: function(ev, ui) {
            var instance = $.data(this, 'navigablelist');
            var elementToDrag = $(ui.item);
            var elements = instance._selectedElements().filter(function() {
                return ! $(this).hasClass('ui-sortable-placeholder')
            });
            var index = $.inArray(elementToDrag[0], elements);
            var arr = elements.toArray();
            var dragState = {};
            dragState.element = elementToDrag;
            elements.addClass('ui-sortable-tomove');
            dragState.nextElements = arr.splice(index + 1);
            arr.splice( - 1);
            dragState.prevElements = arr;
            dragState.originList = instance;
            console.log("DragState", dragState);
            $.data(elementToDrag[0], 'navigablelist-dragstate', dragState);
            instance._setActiveElement(elementToDrag);
            elementToDrag.addClass('ui-selected');
        },
        _onDrop: function(ev, ui) {
            console.log("Drop", ev, ui);
            var droppedElement = $(ui.item);
            var dragState = $.data(droppedElement[0], 'navigablelist-dragstate');
            if (!dragState) {
                console.log('no dragState');
                return false;
            }
            console.log("Droping", droppedElement, droppedElement[0].parentElement.innerHTML);
            console.log("Inserting Before", dragState.prevElements);
            $.each(dragState.prevElements,
            function(index, ele) {
                $(ele).insertBefore(droppedElement).removeClass('ui-sortable-tomove');
            });
            console.log("After inserting before elements", droppedElement[0].parentElement.innerHTML);
            console.log("Inserting After", dragState.nextElements);
            dragState.nextElements = dragState.nextElements.reverse();
            $.each(dragState.nextElements,
            function(index, ele) {
                $(ele).insertAfter(droppedElement).removeClass('ui-sortable-tomove');
            });
            console.log("After inserting After elements", droppedElement[0].parentElement.innerHTML);
            droppedElement.removeClass('ui-sortable-tomove');
            $.data(droppedElement[0], 'navigablelist-dragstate', null);
            var instance = dragState.originList;
            instance._setActiveElement(null);
            var destinationList = $.data(droppedElement[0].parentElement, 'navigablelist');
            if (destinationList) {
                destinationList._setActiveElement(droppedElement);
            }
        },
        _selectedElements: function() {
            var elements = $('.ui-selected', this.element);
            return elements;
        },
        _onKey: function(ev) {
            console.log('keydown', ev, this);
            var key = $.ui.keyCode;
            var withModifier = ev.ctrlKey || ev.metaKey || ev.altKey;
            var instance = $.data(this, 'navigablelist');

            switch (ev.which) {
            case key.UP:
                if (withModifier) {
					if(ev.shiftKey){
						instance._moveTo(instance.topList);
						return;
					}
                    var elements = $('.ui-selected', instance.element);
                    if (!elements.length) {
                        return;
                    }
                    instance._moveUp(elements);
                    instance._setActiveElement(elements[0]);
                } else {
                    instance._focusPrevious();
                }
                break;
            case key.DOWN:
                if (withModifier) {
					if(ev.shiftKey){
						instance._moveTo(instance.bottomList);
						return;
					}
                    var elements = $('.ui-selected', instance.element);
                    if (!elements.length) {
                        return;
                    }
                    instance._moveDown(elements);
                    instance._setActiveElement(elements[elements.length - 1]);
                } else {
                    instance._focusNext();
                }
                break;
			case key.RIGHT:
				if(withModifier && ev.shiftKey){
					instance._moveTo(instance.rightList);
					return;
				}
				break;
			case key.LEFT:
				if(withModifier && ev.shiftKey){
					instance._moveTo(instance.leftList);
					return;
				}
				break;
            case key.SPACE:
                instance._toggleSelectActiveElement();
                break;
            case key.ESCAPE:
                instance._clearSelection();
                break;
            case 65:
                //A
                if (withModifier) {
                    instance._selectAll();
                    ev.preventDefault();
                }
                break;
            }
        }
    });

})();

