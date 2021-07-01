pragma solidity >=0.8.0 <=0.9.0;

contract SplitWise {
    struct Debtor {
        address addr;
        uint256 lastActivity;
        uint32 totalOwned;
        mapping(address => uint32) debts;
    }
    mapping(address => Debtor) debtors;
    address[] users;
    
    function lookup(address debtor, address creditor) public view returns (uint32 ret) {
        ret = debtors[debtor].debts[creditor];
    }

    function add_IOU(address creditor, uint32 amount) public {
        require(amount > 0);
        debtors[msg.sender].lastActivity = block.timestamp;
        if (debtors[creditor].debts[msg.sender] > 0) {
            if (debtors[creditor].debts[msg.sender] > amount) {
                debtors[creditor].debts[msg.sender] -= amount;
                debtors[creditor].totalOwned -= amount;
            } else {
                uint32 remainingAmount = amount - debtors[creditor].debts[msg.sender];
                debtors[msg.sender].debts[creditor] += remainingAmount;
                debtors[msg.sender].totalOwned += remainingAmount;
                debtors[creditor].debts[msg.sender] = 0;
            }
        } else {
            users.push(msg.sender);
            users.push(creditor);
            debtors[msg.sender].debts[creditor] += amount;
            debtors[msg.sender].totalOwned += amount;
        }
    }

    function getLastActive(address user) public view returns (uint256) {
        return debtors[user].lastActivity;
    }

    function getTotalOwed(address user) public view returns (uint32) {
        return debtors[user].totalOwned;
    }

    function sayHello() public view returns (address) {
        return msg.sender;
    }
    function getUsers() public view returns (address[] memory) {
        return users;
    }
}
