'use client';

// import { SwapWidget } from '@uniswap/widgets'
// import '@uniswap/widgets/fonts.css'
import { DISPLAY_DATA } from '@/constants/mockData'

const SwapPage = () => {
  // You should replace these with your actual JSON RPC endpoints
  // const jsonRpcUrlMap = {
  //   1: ['https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID'],
  // }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Token Data */}
      <div className="w-1/2 p-6 bg-white dark:bg-gray-800">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3">Bonding Curve</h2>
            <p>{DISPLAY_DATA.bondingCurve}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Holder Distribution</h2>
            <p>{DISPLAY_DATA.holderDistribution}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Tokenomics</h2>
            <p>{DISPLAY_DATA.tokenomics}</p>
          </section> 

          <section>
            <h2 className="text-xl font-bold mb-3">Exclusivity</h2>
            <p>{DISPLAY_DATA.exclusivity}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Progress</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: '20%' }}
              ></div>
            </div>
            <p className="mt-2">20% Complete</p>
          </section>
        </div>
      </div>

      {/* Right side - Swap Widget */}
      <div className="w-1/2 p-6 flex justify-center items-start bg-gray-50 dark:bg-gray-900">
        <div className="w-[360px]">
          {/* <SwapWidget
            jsonRpcUrlMap={jsonRpcUrlMap}
            width="100%"
            theme={{
              primary: '#000000',
              secondary: '#666666',
              interactive: '#FFFFFF',
              container: '#FFFFFF',
              module: '#FAFAFA',
              accent: '#2172E5',
              outline: '#2172E5',
              dialog: '#FFFFFF',
              fontFamily: 'Inter, sans-serif'
            }}
          /> */}
        </div>
      </div>
    </div>
  );
};

export default SwapPage;
