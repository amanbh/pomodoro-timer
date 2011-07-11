// A pomodoro timer for Gnome-shell
// Copyright (C) 2011 Aman Bhatia
// 
// Derived  from a similar extension by Arun Mahapatra
// Thanks to FP Murphy for his good articles
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const St = imports.gi.St;
const Main = imports.ui.main;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Gettext = imports.gettext.domain('gnome-shell');
const _ = Gettext.gettext;

let _pomodoroInit = false;

function Indicator() {
    this._init.apply(this, arguments);
}

Indicator.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'text-x-generic-symbol');

        this._timer = new St.Label();
        this._timeSpent = -1;
        this._stopTimer = true;
		this._breakOn = false;
        this._sessionCount = 0;
		this._showElapsed = true;
		
		this._showMessagesEnabled = false;

        this._sessionLength = 25;
		this._breakLength = 5;

		this._timer.set_text("[0] --");
	    this.actor.add_actor(this._timer);

        // Toggle timer state button
        this._widget = new PopupMenu.PopupSwitchMenuItem(_("Toggle Timer"), false);
        this._widget.connect("toggled", Lang.bind(this, this._toggleTimerState));
        this.menu.addMenuItem(this._widget);

		let item = new PopupMenu.PopupSeparatorMenuItem();
	    this.menu.addMenuItem(item);	
	
		this._optionsMenu = new PopupMenu.PopupSubMenuMenuItem('Options');
		this.menu.addMenuItem(this._optionsMenu);
		
		this.buildOptionsMenu();
	
		// Register keybindings to toggle
        //let shellwm = global.window_manager;
        //shellwm.takeover_keybinding('something_new');
        //shellwm.connect('keybinding::something_new', function () {
            //Main.runDialog.open();
        //});

        // Bind to system events - like lock or away

        // Start the timer
        this._incrementTimer();
    },

    
    _resetCount: function() {
		// this._stopTimer = item.state;
		this._sessionCount = 0;
		if (this._stopTimer == false) {
			this._breakOn = true;
			this._stopTimer = true;
		}
     	this._timer.set_text("[" + this._sessionCount + "] --");
		this._widget.setToggleState(false);
		return false;
    },

    _toggleTimerState: function(item) {
        this._stopTimer = item.state;
        if (this._stopTimer == false) {
			this._stopTimer = true;
			this._breakOn = false;
			this._timer.set_text("[" + this._sessionCount + "] --");
        }
        else {
			this._timeSpent = -1;
			this._stopTimer = false;
			this._breakOn = false;
			this._incrementTimer();
			if (this._showMessagesEnabled)
				this._showMessageAtStart();
        }
    },

	timerTypeToggle: function() {
		if (this._showElapsed == true) {
			this._showElapsed = false;
			this._timerTypeMenu.label.set_text(_("Show Elapsed Time"));	
		} else {
			this._showElapsed = true;
			this._timerTypeMenu.label.set_text(_("Show Remaining Time"));
		}
	
		this._updateTimer();
			 	
		return false;
	},

	buildOptionsMenu: function() {
       	// Timer format Menu
       	if (this._showElapsed == true)
			 this._timerTypeMenu = new PopupMenu.PopupMenuItem(_("Show Remaining Time"));
		else
			 this._timerTypeMenu = new PopupMenu.PopupMenuItem(_("Show Elapsed Time"));
			
		this._optionsMenu.menu.addMenuItem(this._timerTypeMenu);
		this._timerTypeMenu.connect('activate', Lang.bind(this, this.timerTypeToggle));
		
		// Session Length menu
		this._slider1Title = new PopupMenu.PopupMenuItem(_("Session Length " + this._sessionLength), { reactive: false });
        this._slider1Slider = new PopupMenu.PopupSliderMenuItem(this._sessionLength/60);
        this._slider1Slider.connect('drag-end', Lang.bind(this, this._slider1Changed));
        // this._outputSlider.connect('value-changed', Lang.bind(this, this._notifyVolumeChange));
        this._optionsMenu.menu.addMenuItem(this._slider1Title);
        this._optionsMenu.menu.addMenuItem(this._slider1Slider);
		
		// Break Length menu
		this._slider2Title = new PopupMenu.PopupMenuItem(_("Break Length " + this._breakLength), { reactive: false });
        this._slider2Slider = new PopupMenu.PopupSliderMenuItem(this._breakLength/15);
        this._slider2Slider.connect('drag-end', Lang.bind(this, this._slider2Changed));
        // this._outputSlider.connect('value-changed', Lang.bind(this, this._notifyVolumeChange));
        this._optionsMenu.menu.addMenuItem(this._slider2Title);
        this._optionsMenu.menu.addMenuItem(this._slider2Slider);


		// ShowMessages option toggle
		this._showMessagesSwitch = new PopupMenu.PopupSwitchMenuItem(_("Popup Messages"), this._showMessagesEnabled);
        this._showMessagesSwitch.connect("toggled", Lang.bind(this, function() {
			this._showMessagesEnabled = !(this._showMessagesEnabled);
		}));
		this._optionsMenu.menu.addMenuItem(this._showMessagesSwitch);
		
		// Reset counters Menu
		this._resetMenu =  new PopupMenu.PopupMenuItem(_('Reset Counts and Timer'));
        this._optionsMenu.menu.addMenuItem(this._resetMenu);
        this._resetMenu.connect('activate', Lang.bind(this, this._resetCount));
		
	},
	
	_slider1Changed: function() {
		this._sessionLength = Math.ceil(this._slider1Slider._value * 60);
		this._slider1Title.label.set_text(_("Session Length " + this._sessionLength));
		this._checkTimerState();
		this._updateTimer();
	},

	_slider2Changed: function() {
		this._breakLength = Math.ceil(this._slider2Slider._value * 15);
		this._slider2Title.label.set_text(_("Break Length " + this._breakLength));
		this._checkTimerState();
		this._updateTimer();
	},	

	
	_checkTimerState: function() {
		if(this._stopTimer == false) {
			if (this._breakOn == false) {
				if (this._timeSpent > this._sessionLength-1) {
                	this._timeSpent = 0;
	                this._sessionCount += 1;
					if ( this._breakLength != 0) {
						this._breakOn = true;
						if (this._showMessagesEnabled)
							this._showMessageAtComplete();
					}
				}
    		} else {
				if (this._timeSpent > this._breakLength-1) {
					this._timeSpent = 0;
					if (this._sessionLength != 0) {
						this._breakOn = false;
						if(this._showMessagesEnabled)
							this._showMessageAtStart();
					}
				}
			}	
		}
	},
	
	_incrementTimer: function() {
		if (this._stopTimer == false) {
          	this._timeSpent += 1;
           	this._checkTimerState();
			this._updateTimer();
			Mainloop.timeout_add_seconds(60, Lang.bind(this, this._incrementTimer));
		}
		
		this._updateTimer();
		return false;
	},
	
	_updateTimer: function() {
		if (this._stopTimer == false) {
			let displaytime = this._timeSpent;
			if (this._showElapsed == false) {
				if (this._breakOn == false)
					displaytime = this._sessionLength - this._timeSpent;
				else
					displaytime = this._breakLength - this._timeSpent;
			}
			
			if (this._breakOn == false) {
        		if (displaytime < 10)
      		  		this._timer.set_text("[" + this._sessionCount + "]  0" + displaytime.toString());
				else
					this._timer.set_text("[" + this._sessionCount + "]  " + displaytime.toString());
			} else {
		 		if (displaytime < 10)
        	   		this._timer.set_text("[" + this._sessionCount + "] *0" + displaytime.toString());
				else
					this._timer.set_text("[" + this._sessionCount + "] *" + displaytime.toString());
			}	
		}
        
		return false;
    },

    
	_showMessageAtComplete: function() {
		let text = new St.Label({ style_class: 'helloworld-label', text: _( "Session ("+ this._sessionCount + ") Ends - Take a Break for " + this._breakLength + " minutes.") });
		let monitor = global.get_primary_monitor();
    	global.stage.add_actor(text);
		text.set_position(Math.floor (monitor.width / 2 - text.width / 2 ), Math.floor(monitor.height / 2 - text.height/2) );
		Mainloop.timeout_add(2000, function () { text.destroy(); });
   },

 	_showMessageAtStart: function() {
		let text = new St.Label({ style_class: 'helloworld-label', text: _( "Session (" + (this._sessionCount + 1) + ") Starts - Work for " + this._sessionLength + " minutes.") });
		let monitor = global.get_primary_monitor();
    	global.stage.add_actor(text);
		text.set_position(Math.floor (monitor.width / 2 - text.width / 2 ), Math.floor(monitor.height / 2 - text.height/2) );
		Mainloop.timeout_add(4000, function () { text.destroy(); });
   }

};

// Put your extension initialization code here
function main() {
    if (!_pomodoroInit) {
        Main.StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['pomodoro'] = 'pomodoro';
        Main.Panel.STANDARD_TRAY_ICON_ORDER.unshift('pomodoro');
        Main.Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION['pomodoro'] = Indicator;
        _pomodoroInit = true;
    }
}
