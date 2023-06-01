# rocketsplit
Withdrawal address contract for splitting Rocket Pool node rewards

# Steps to run
1. Run a dev chain in a dedicated terminal: `anvil -f <your_eth1_node>:<node_port> --derivation-path "m/44'/60'/0'/"`
2. In the root directory of the project install eth-ape using pip: `pip install eth-ape`
3. Run `ape plugins install .`
4. Run `ape compile`
5. Run `ape run -I deploy`
6. In the `ui/` directory run `node setup.js`
7. Serve the `ui/` directory using an http server such as `python -m http.server 8000`

You want to make sure the RPC endpoint address in both `ape-config.yml` and `ui/setup.js` is pointing to your running RPC endpoint. For example, `http://127.0.0.1:8545` if running a local dev net. 