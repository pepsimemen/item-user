module.exports = function ItemUser(mod) {

	const path = require('path'),
	    fs = require('fs'),
		command = mod.command || mod.require.command
	
	let gameId,
		enabled = false,
		grabItem = false,
		tempID,
		contract,
		amount,
		doneBuying = false,
		tempList = [],
		invenItems = [],
		itemFilter = [],
		items = []
		
	try {
		itemconfig = require('./itemconfig.json')
	} catch(e) {
		itemconfig = {
			"delay": "250",
            "itemList": [
				201032,
				201033,
				201034,
				201035,
				209901,
				209902,
				209903,
				209904,
				209905,
				209923
			]
		}
		saveItems()
	}
	
	mod.hook('S_LOGIN', 14, event => { gameId = event.gameId })
	
	mod.hook('S_ITEMLIST', 3, event => {
		if(enabled && event.container !== 14) {
			tempList = event.items
			if(!event.more) invenItems = invenItems.concat(tempList);
		}
	})
	
	mod.hook('C_USE_ITEM', 3, event => {
		if(grabItem && itemconfig.itemList.includes(event.id)) {
			itemAdd()
			command.message('Item already in config, will start using now.')
		} else if(grabItem) {
			tempID = event.id
			itemAdd()
			command.message('Using Item ID ' + event.id + ' now.')
		}
	})
	
	function itemAdd() {
		grabItem = false
		enabled = true
		mod.send('C_SHOW_ITEMLIST', 1, {gameId: gameId})
		setTimeout(getItems, 1500)
	}

	mod.hook('S_SYSTEM_MESSAGE', 1, event => {
		if(enabled && event.message === '@338') {
			enabled = false
			command.message('No more items to use, stopping.')
		}
	})
	
	function getItems() {
		if(!enabled) return
		itemFilter = invenItems.filter(item => (itemconfig.itemList.includes(item.id) || item.id === tempID))
		items = itemFilter.pop()
		setTimeout(useItem, itemconfig.delay)
	}

	function useItem() {
		if(itemFilter.length > 0) {
			mod.toServer('C_USE_ITEM', 3, {
				gameId: gameId,
				id: items.id,
				dbid: items.dbid,
				amount: 1
			})
			items = []
			getItems()
		} else {
			enabled = false
			command.message('No items found in inventory.')
		}
	}
	
	mod.hook('S_MEDAL_STORE_SELL_LIST', 2, event => { contract = event.contract })

	mod.hook('S_MEDAL_STORE_BASKET', 1, event => { if((event.cost || event.credits) >= amount) doneBuying = true })

	function buyItems() {
		if(!doneBuying) {
			mod.send('C_MEDAL_STORE_BUY_ADD_BASKET', 1, {
				gameId: gameId,
				contract: contract,
				item: 201043,
				amount: 1
			})
			setTimeout(buyItems, 300)
		} else {
			mod.send('C_MEDAL_STORE_COMMIT', 1, {
				gameId: gameId,
				contract: contract
			})
			doneBuying = false
			command.message('Done buying items.')
		}
	}

	function saveItems() {
        fs.writeFile(path.join(__dirname, 'itemconfig.json'), JSON.stringify(itemconfig, null, 4), err => {
        })
    }
	
	command.add('item', (arg, value) => {
		switch (arg) {
			case undefined:
				itemAdd()
				command.message('Using items automically now.')
				break
			case "delay":
				itemconfig.delay = value
				command.message('Delay set to ' + itemconfig.delay + 'ms')
				break
			case "id":
                grabItem = true
				command.message('Press the item you want to use automatically.')
                break
			case "buy":
				if(value > 18) {
					command.message('Please enter a lower value.')
					return
				}
				amount = value
				buyItems()
				command.message('Buying ' + amount + ' items.')
				break
			case "stop":
				enabled = false
				command.message('Stopping module.')
				break
		}
		saveItems()
	})
}