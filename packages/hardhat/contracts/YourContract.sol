//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

// Use openzeppelin to inherit battle-tested implementations (ERC20, ERC721, etc)
// import "@openzeppelin/contracts/access/Ownable.sol";

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {RandomNumberV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/RandomNumberV2Interface.sol";

/**
 * A smart contract that stores and manages reviews for wallet addresses
 * @author BuidlGuidl
 */
contract YourContract {
    // State Variables
    address public immutable owner;
    RandomNumberV2Interface internal randomV2;

    // Review struct definition
    struct Review {
        string platformName;
        uint16 starRating; // Rating out of 500 (5.00 stars), stored as integer with 2 decimal precision
        uint256 numberOfReviews;
        uint256 ageOfAccount;
        string accountName;
        string pictureId;
    }

    // Mapping from wallet address to array of reviews
    mapping(address => Review[]) private walletReviews;
    
    // --- ERC20 ReviewSync Token Implementation ---
    string public constant tokenName = "ReviewSync Token";
    string public constant tokenSymbol = "RST";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Events: a way to emit log statements from smart contract that can be listened to by external parties
    event ReviewAdded(address indexed walletAddress, uint256 reviewIndex);
    event ReviewsDeleted(address indexed walletAddress, uint256 count);
    event TokensRewarded(address indexed reviewer, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Constructor: Called once on contract deployment
    // Check packages/hardhat/deploy/00_deploy_your_contract.ts
    constructor(address _owner) {
        owner = _owner;
        // Initialize the RandomNumberV2 interface from Flare Network
        randomV2 = ContractRegistry.getRandomNumberV2();
    }

    // Modifier: used to define a set of rules that must be met before or after a function is executed
    // Check the withdraw() function
    modifier isOwner() {
        // msg.sender: predefined variable that represents address of the account that called the current function
        require(msg.sender == owner, "Not the Owner");
        _;
    }

    /**
     * Function that allows anyone to write a review for a wallet address
     *
     * @param _walletAddress - the wallet address to write a review for
     * @param _platformName - name of the platform
     * @param _starRating - star rating out of 5
     * @param _numberOfReviews - number of reviews
     * @param _ageOfAccount - age of the account
     * @param _accountName - account name
     * @param _pictureId - picture ID
     */
    function writeReview(
        address _walletAddress,
        string memory _platformName,
        uint16 _starRating,
        uint256 _numberOfReviews,
        uint256 _ageOfAccount,
        string memory _accountName,
        string memory _pictureId
    ) public {
        require(_walletAddress != address(0), "Invalid wallet address");
        require(_starRating <= 500, "Star rating must be between 0 and 500 (representing 0.00 to 5.00)");
        require(bytes(_platformName).length > 0, "Platform name cannot be empty");

        Review memory newReview = Review({
            platformName: _platformName,
            starRating: _starRating,
            numberOfReviews: _numberOfReviews,
            ageOfAccount: _ageOfAccount,
            accountName: _accountName,
            pictureId: _pictureId
        });

        walletReviews[_walletAddress].push(newReview);
        
        console.log("Review added for wallet %s on platform %s", _walletAddress, _platformName);
        
        emit ReviewAdded(_walletAddress, walletReviews[_walletAddress].length - 1);
        
        // Reward the reviewer with 1-5 ReviewSync tokens
        (uint256 randomNumber, bool isSecure, ) = randomV2.getRandomNumber();
        require(isSecure, "Random number is not secure");
        uint256 mintAmount = (randomNumber % 5) + 1; // Get a number between 1 and 5
        _mint(msg.sender, mintAmount * 10 ** uint256(decimals));
        
        console.log("Minted %s ReviewSync tokens to reviewer %s", mintAmount, msg.sender);
        
        emit TokensRewarded(msg.sender, mintAmount);
    }

    /**
     * Function that returns all reviews for a given wallet address
     *
     * @param _walletAddress - the wallet address to get reviews for
     * @return Review[] - array of all reviews for the wallet address
     */
    function getReviews(address _walletAddress) public view returns (Review[] memory) {
        return walletReviews[_walletAddress];
    }

    /**
     * Function that deletes all reviews for a given wallet address
     * Can only be called by the wallet owner themselves
     *
     * @param _walletAddress - the wallet address to delete reviews for
     */
    function deleteReviews(address _walletAddress) public {
        require(msg.sender == _walletAddress, "You can only delete your own reviews");
        
        uint256 reviewCount = walletReviews[_walletAddress].length;
        delete walletReviews[_walletAddress];
        
        console.log("Deleted %s reviews for wallet %s", reviewCount, _walletAddress);
        
        emit ReviewsDeleted(_walletAddress, reviewCount);
    }

    /**
     * Function that returns the number of reviews for a wallet address
     *
     * @param _walletAddress - the wallet address to check
     * @return uint256 - number of reviews
     */
    function getReviewCount(address _walletAddress) public view returns (uint256) {
        return walletReviews[_walletAddress].length;
    }

    // --- ERC20 Functions ---
    
    /**
     * Transfer tokens to another address
     *
     * @param _to - recipient address
     * @param _value - amount to transfer
     * @return bool - success status
     */
    function transfer(address _to, uint256 _value) external returns (bool) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        _transfer(msg.sender, _to, _value);
        return true;
    }

    /**
     * Approve an address to spend tokens on your behalf
     *
     * @param _spender - address to approve
     * @param _value - amount to approve
     * @return bool - success status
     */
    function approve(address _spender, uint256 _value) external returns (bool) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    /**
     * Transfer tokens from one address to another (requires approval)
     *
     * @param _from - source address
     * @param _to - recipient address
     * @param _value - amount to transfer
     * @return bool - success status
     */
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        allowance[_from][msg.sender] -= _value;
        _transfer(_from, _to, _value);
        return true;
    }

    // --- Internal ERC20 Helpers ---
    
    /**
     * Internal function to transfer tokens
     *
     * @param _from - source address
     * @param _to - recipient address
     * @param _value - amount to transfer
     */
    function _transfer(address _from, address _to, uint256 _value) internal {
        require(_to != address(0), "Transfer to zero address");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(_from, _to, _value);
    }

    /**
     * Internal function to mint new tokens
     *
     * @param _to - recipient address
     * @param _value - amount to mint
     */
    function _mint(address _to, uint256 _value) internal {
        require(_to != address(0), "Mint to zero address");
        totalSupply += _value;
        balanceOf[_to] += _value;
        emit Transfer(address(0), _to, _value);
    }

    /**
     * Function that allows the owner to withdraw all the Ether in the contract
     * The function can only be called by the owner of the contract as defined by the isOwner modifier
     */
    function withdraw() public isOwner {
        (bool success, ) = owner.call{ value: address(this).balance }("");
        require(success, "Failed to send Ether");
    }

    /**
     * Function that allows the contract to receive ETH
     */
    receive() external payable {}
}
