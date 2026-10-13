export const BOT_BOUNTY_ESCROW_ABI = [
  {
    "type": "function",
    "name": "createBounty",
    "stateMutability": "payable",
    "inputs": [
      { "name": "bountyId", "type": "bytes32" },
      { "name": "settlementToken", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "reviewPeriod", "type": "uint256" },
      { "name": "issueUrl", "type": "string" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "submitSolution",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "bountyId", "type": "bytes32" },
      { "name": "prUrl", "type": "string" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "releaseBounty",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "bountyId", "type": "bytes32" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "rejectSolution",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "bountyId", "type": "bytes32" },
      { "name": "reason", "type": "string" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "claimTimeoutRelease",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "bountyId", "type": "bytes32" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "refundBounty",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "bountyId", "type": "bytes32" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "bounties",
    "stateMutability": "view",
    "inputs": [{ "name": "", "type": "bytes32" }],
    "outputs": [
      { "name": "bountyId", "type": "bytes32" },
      { "name": "maintainer", "type": "address" },
      { "name": "solver", "type": "address" },
      { "name": "settlementToken", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "createdAt", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "submittedAt", "type": "uint256" },
      { "name": "reviewPeriod", "type": "uint256" },
      { "name": "status", "type": "uint8" },
      { "name": "issueUrl", "type": "string" },
      { "name": "prUrl", "type": "string" }
    ]
  },
  {
    "type": "function",
    "name": "getBountyCount",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "getBounty",
    "stateMutability": "view",
    "inputs": [{ "name": "bountyId", "type": "bytes32" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "bountyId", "type": "bytes32" },
          { "name": "maintainer", "type": "address" },
          { "name": "solver", "type": "address" },
          { "name": "settlementToken", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "deadline", "type": "uint256" },
          { "name": "submittedAt", "type": "uint256" },
          { "name": "reviewPeriod", "type": "uint256" },
          { "name": "status", "type": "uint8" },
          { "name": "issueUrl", "type": "string" },
          { "name": "prUrl", "type": "string" }
        ]
      }
    ]
  },
  {
    "type": "function",
    "name": "getBounties",
    "stateMutability": "view",
    "inputs": [
      { "name": "offset", "type": "uint256" },
      { "name": "limit", "type": "uint256" }
    ],
    "outputs": [
      {
        "name": "items",
        "type": "tuple[]",
        "components": [
          { "name": "bountyId", "type": "bytes32" },
          { "name": "maintainer", "type": "address" },
          { "name": "solver", "type": "address" },
          { "name": "settlementToken", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "deadline", "type": "uint256" },
          { "name": "submittedAt", "type": "uint256" },
          { "name": "reviewPeriod", "type": "uint256" },
          { "name": "status", "type": "uint8" },
          { "name": "issueUrl", "type": "string" },
          { "name": "prUrl", "type": "string" }
        ]
      },
      { "name": "total", "type": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "getMaintainerBounties",
    "stateMutability": "view",
    "inputs": [{ "name": "maintainer", "type": "address" }],
    "outputs": [{ "name": "", "type": "bytes32[]" }]
  },
  {
    "type": "function",
    "name": "getSolverBounties",
    "stateMutability": "view",
    "inputs": [{ "name": "solver", "type": "address" }],
    "outputs": [{ "name": "", "type": "bytes32[]" }]
  }
];

export const ERC20_ABI = [
  {
    "type": "function",
    "name": "name",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }]
  },
  {
    "type": "function",
    "name": "symbol",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }]
  },
  {
    "type": "function",
    "name": "decimals",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8" }]
  },
  {
    "type": "function",
    "name": "balanceOf",
    "stateMutability": "view",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "allowance",
    "stateMutability": "view",
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "transfer",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }]
  },
  {
    "type": "function",
    "name": "approve",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }]
  }
];
