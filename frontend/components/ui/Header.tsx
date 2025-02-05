// Components
import { ConnectWallet } from "./ConnectWallet";

export const Header = () => {
  return (
    <div className="border px-4 py-2 flex justify-between items-center bg-gray-200">
      <div className="flex gap-8 items-center">
        <h1 className="text-2xl font-bold">bouncer.ai</h1>
        <div>
          <ul className="flex gap-4">
            <li>
              <a href="#">Token Launches</a>
            </li>
            <li>
              <a href="#">About</a>
            </li>
            <li>
              <a href="#">Documentation</a>
            </li>
          </ul>
        </div>
      </div>
      <div>
        <ConnectWallet />
      </div>
    </div>
  );
};
