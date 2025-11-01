/**
 * PingPong contract ABI (minimal - only what we need)
 * Contract: 0xa7f42ff7433cb268dd7d59be62b00c30ded28d3d (Sepolia)
 * Full ABI: https://sepolia.etherscan.io/address/0xa7f42ff7433cb268dd7d59be62b00c30ded28d3d#code
 */
export const PING_PONG_ABI = [
  // Ping event - we listen to this
  {
    anonymous: false,
    inputs: [],
    name: 'Ping',
    type: 'event',
  },
  // pong() function - we call this
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_txHash',
        type: 'bytes32',
      },
    ],
    name: 'pong',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export default PING_PONG_ABI
