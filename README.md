# rocketsplit
Withdrawal address contract for splitting Rocket Pool node rewards

# Contract functionality
Here we give an overview of how the contract works.
In practice, users will set it up and interact with it using our web-based UI (i.e. there is no need to directly interact with the contracts).
This information is provided for the sake of understanding what using a RocketSplit withdrawal address means at a deeper level.

## Actors
The following accounts are of relevance:
- RocketSplit Factory: the template contract to which all RocketSplit deployments are a proxy
- RocketSplit deployment: a proxy to the RocketSplit factory that acts as the withdrawal address for a particular Rocket Pool node
- Rocket Pool node: each RocketSplit deployment is associated with a registered Rocket Pool node account
- ETH Owner: the account that provides all ETH for the node, receives all ETH rewards (minus fee), and optionally receives a fraction of the RPL rewards as fee
- RPL Owner: the account that provides all RPL for the node, receives all RPL rewards (minus fee), and optionally receives a fraction of the ETH rewards as fee

## Actions
- Create deployment: create a new RocketSplit deployment from the factory, specifying the following parameters:
  - The associated Rocket Pool node
  - The ETH owner
  - The RPL owner
  - The ETH fee fraction (what fraction of ETH rewards will go to the RPL owner)
  - The RPL fee fraction (what fraction of RPL rewards will go to the ETH owner)

  Note that these parameters cannot be changed after deployment.
- Confirm withdrawal address: confirm the RocketSplit deployment as the withdrawal address for its associated Rocket Pool node.
- Stake RPL (RPL Owner only): stake RPL on the Rocket Pool node (via the withdrawal address's stake-on-behalf feature). All RPL staked on the node should be staked via this function; the RocketSplit deployment tracks the total RPL principal that has been staked. Note in particular that Rocket Pool's claim-and-restake functionality is not supported, since this would be staking RPL without using the RocketSplit Stake RPL function.
- Withdraw rewards (RPL Owner only): Assume the ETH and RPL balances of the RocketSplit deployment are entirely made of rewards from the node. Calculate fees on the ETH and RPL rewards, send ETH rewards (minus fee) and RPL fee to the ETH owner, send RPL rewards (minus fee) and ETH fee to the RPL Owner. Note: if any RPL principal has already been withdrawn from the node, Withdraw RPL must be called before Withdraw rewards for correct accounting.
- Withdraw RPL (RPL Owner only): return (part of) the RPL principal to the RPL owner, in particular the difference between the previous RPL principal amount and the current RPL staked on the node. (It is assumed that this difference will be in the balance of the RocketSplit deployment, ready to be transferred to the RPL Owner.)
- Withdraw ETH (ETH Owner only, only when the RPL principal and the node's RPL stake are both 0): return the RocketSplit deployment's ETH balance to the ETH Owner. Note that the requirement for the node's RPL stake and principal to be 0 ensures Withdraw ETH is only called after Withdraw RPL and Withdraw rewards are called, ensuring correct accounting.
- Set ENS name: confirm an ENS name as the primary name for the RocketSplit deployment.
- Change node withdrawal address (ETH Owner only): set a new withdrawal address for the Rocket Pool node (assuming the current withdrawal address is the RocketSplit deployment).
- Confirm change node withdrawal address (RPL Owner only): confirm a pending change of the node's withdrawal address.



# Steps to run on dev net
1. Run a dev chain in a dedicated terminal: `anvil -f <your_eth1_node>:<node_port> --derivation-path "m/44'/60'/0'/"`
2. In the root directory of the project install eth-ape using pip: `pip install eth-ape`
3. Run `ape plugins install .`
4. Run `ape compile`
5. Run `ape run -I deploy`
6. In the `ui/` directory run `node setup.js`
7. Serve the `ui/` directory using an http server such as `python -m http.server 8000`

You want to make sure the RPC endpoint address in both `ape-config.yml` and `ui/setup.js` is pointing to your running RPC endpoint. For example, `http://127.0.0.1:8545` if running a local dev net.
