// =============================================================================
//                                  Config
// =============================================================================

// sets up web3.js
// Web3 calls locally from file web3.min.js
if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

// Default account is the first one
web3.eth.defaultAccount = web3.eth.accounts[0];
// Constant we use later
var GENESIS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// This is the ABI for your contract (get it from Remix, in the 'Compile' tab)
// If you use truffle you can load abi from truffle build folder
// ============================================================
var abi = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "creditor",
				"type": "address"
			},
			{
				"internalType": "uint32",
				"name": "amount",
				"type": "uint32"
			}
		],
		"name": "add_IOU",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getLastActive",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getTotalOwed",
		"outputs": [
			{
				"internalType": "uint32",
				"name": "",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getUsers",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "debtor",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "creditor",
				"type": "address"
			}
		],
		"name": "lookup",
		"outputs": [
			{
				"internalType": "uint32",
				"name": "ret",
				"type": "uint32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "sayHello",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]; // FIXME: fill this in with your contract's ABI
// ============================================================
abiDecoder.addABI(abi);
// call abiDecoder.decodeMethod to use this - see 'getAllFunctionCalls' for more

// Reads in the ABI
var BlockchainSplitwiseContractSpec = web3.eth.contract(abi);

// This is the address of the contract you want to connect to; copy this from Remix
var contractAddress = "0x8d236b5771d2760eF10CB8773dbC237174d8879f"; // FIXME: fill this in with your contract's address/hash

var BlockchainSplitwise = BlockchainSplitwiseContractSpec.at(contractAddress);

// =============================================================================
//                            Functions To Implement
// =============================================================================

// You can return either:
//   - a list of everyone who has ever sent or received an IOU
// OR
//   - a list of everyone currently owing or being owed money
function getUsers() {
  console.log("Running getUsers");
  users = BlockchainSplitwise.getUsers.call();
  console.log(users);
  return users;
}

function getTotalOwed(user) {
  console.log("Running getTotalOwed");
  total_owed = BlockchainSplitwise.getTotalOwed.call(user).toNumber();
  console.log(total_owed);
  return total_owed;
}

// Return null if you can't find any activity for the user.
// HINT: Try looking at the way 'getAllFunctionCalls' is written. You can modify it if you'd like.
function getLastActive(user) {
  console.log("Running getLastActive");
  last_active = BlockchainSplitwise.getLastActive.call(user).toNumber();
  console.log(last_active);
  return last_active;
}

// The person you owe money is passed as 'creditor'
// The amount you owe them is passed as 'amount'
function add_IOU(creditor, amount) {
  console.log("Running add_IOU");
  console.log("Arguments ", creditor, amount);
  bfs_result = doBFS(creditor, web3.eth.defaultAccount, getNeighbors);
	console.log("BFS RESULT: ", bfs_result)
	if (bfs_result) {
		min_debt = Infinity
		for (i=0; i<bfs_result.length-1;i++) {
			debt = BlockchainSplitwise.lookup.call(bfs_result[i], bfs_result[i+1]).toNumber();
			if (debt<min_debt) {
				min_debt = debt
			}
		}
		BlockchainSplitwise.add_IOU(creditor, amount-min_debt, {
			from: web3.eth.defaultAccount,
			gas: 1000000,
		});
		for (i=0;i<bfs_result.length-1;i++) {
			BlockchainSplitwise.add_IOU(bfs_result[i], min_debt, {
				from: bfs_result[i+1],
				gas: 1000000,
			});
		}

	} else {
		BlockchainSplitwise.add_IOU(creditor, amount, {
			from: web3.eth.defaultAccount,
			gas: 1000000,
		});
	}
}

// =============================================================================
//                              Provided Functions
// =============================================================================
// Reading and understanding these should help you implement the above

// This searches the block history for all calls to 'functionName' (string) on the 'addressOfContract' (string) contract
// It returns an array of objects, one for each call, containing the sender ('from') and arguments ('args')
function getAllFunctionCalls(addressOfContract, functionName) {
  var curBlock = web3.eth.blockNumber;
  var function_calls = [];
  while (curBlock !== GENESIS) {
    var b = web3.eth.getBlock(curBlock, true);
    var txns = b.transactions;
    for (var j = 0; j < txns.length; j++) {
      var txn = txns[j];
      // check that destination of txn is our contract
      if (txn.to === addressOfContract) {
        var func_call = abiDecoder.decodeMethod(txn.input);
        // check that the function getting called in this txn is 'functionName'
        if (func_call && func_call.name === functionName) {
          var args = func_call.params.map(function (x) {
            return x.value;
          });
          function_calls.push({
            from: txn.from,
            args: args,
          });
        }
      }
    }
    curBlock = b.parentHash;
  }
  return function_calls;
}

// We've provided a breadth-first search implementation for you, if that's useful
// It will find a path from start to end (or return null if none exists)
// You just need to pass in a function ('getNeighbors') that takes a node (string) and returns its neighbors (as an array)
function doBFS(start, end, getNeighbors) {
  var queue = [[start]];
  while (queue.length > 0) {
    var cur = queue.shift();
    var lastNode = cur[cur.length - 1];
    if (lastNode === end) {
      return cur;
    } else {
      var neighbors = getNeighbors(lastNode);
      for (var i = 0; i < neighbors.length; i++) {
        queue.push(cur.concat([neighbors[i]]));
      }
    }
  }
  return null;
}

// you can implement getNeighbors function here
function getNeighbors(node) {
  neighbors = [];
  users = getUsers();
  for (i	 in users) {
    debt = BlockchainSplitwise.lookup.call(node, users[i]).toNumber();
		
		console.log("IN GET_NEIGHBORS ",node,users[i], debt)
    if (debt > 0) {
      neighbors.push(users[i]);
    }
  }
  return neighbors;
}

// =============================================================================
//                                      UI
// =============================================================================

// This code updates the 'My Account' UI with the results of your functions
$("#total_owed").html("$" + getTotalOwed(web3.eth.defaultAccount));
$("#last_active").html(timeConverter(getLastActive(web3.eth.defaultAccount)));
$("#myaccount").change(function () {
  web3.eth.defaultAccount = $(this).val();
  $("#total_owed").html("$" + getTotalOwed(web3.eth.defaultAccount));
  $("#last_active").html(timeConverter(getLastActive(web3.eth.defaultAccount)));
});

// Allows switching between accounts in 'My Account' and the 'fast-copy' in 'Address of person you owe
var opts = web3.eth.accounts.map(function (a) {
  return '<option value="' + a + '">' + a + "</option>";
});
$(".account").html(opts);
$(".wallet_addresses").html(
  web3.eth.accounts.map(function (a) {
    return "<li>" + a + "</li>";
  })
);

// This code updates the 'Users' list in the UI with the results of your function
$("#all_users").html(
  getUsers().map(function (u, i) {
    return "<li>" + u + "</li>";
  })
);

// This runs the 'add_IOU' function when you click the button
// It passes the values from the two inputs above
$("#addiou").click(function () {
  add_IOU($("#creditor").val(), $("#amount").val());
  window.location.reload(true); // refreshes the page after
});

// This is a log function, provided if you want to display things to the page instead of the JavaScript console
// Pass in a discription of what you're printing, and then the object to print
function log(description, obj) {
  $("#log").html(
    $("#log").html() +
      description +
      ": " +
      JSON.stringify(obj, null, 2) +
      "\n\n"
  );
}
