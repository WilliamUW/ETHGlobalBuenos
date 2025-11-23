Flare
I deployed the ReviewSync smart contract on the Flare testnet to store cross-platform review metadata. Flare’s data-optimized architecture lets us reliably anchor rating information on-chain. We also use Flare’s RNG to mint a randomized amount of ReviewSync tokens as rewards whenever users upload verified reputation data.

I originally wanted to use the FDC to verify Web2 review data through mock APIs, but unfortunately the 60 second wait time made it impractical for a real time consumer app and for demoing purposes due to the time constraints.

Flare Walkthrough Video:
https://youtu.be/8bTvrva-pLU

Deployed Smart Contract on Flare Coston2 Testnet:
https://testnet.routescan.io/address/0x6A3c3B82E95f010C4bc63A7a378b2233dF6bB737/contract/114/code

Flare RNG Use in Smart Contract: https://github.com/WilliamUW/ETHGlobalBuenos/blob/7be7098aa836036e4fab8836d104986c834b2743/packages/hardhat/contracts/YourContract.sol#L107-L114