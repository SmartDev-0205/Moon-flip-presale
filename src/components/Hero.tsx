import { useState, useEffect, useMemo } from "react";
import { getSubString, toBigNum } from "../utils";
import { useWeb3Modal } from "@web3modal/react";
import { NotificationManager } from "react-notifications";
import { ProgressBar } from "react-rainbow-components";
import { Container, Divider } from "@mui/material";
import Countdown from "react-countdown";
import {
  type WalletClient,
  useWalletClient,
  useAccount,
  useDisconnect,
  useContractWrite,
} from "wagmi";
import { type PublicClient, usePublicClient } from "wagmi";



import { ethers, providers } from "ethers";
import { type HttpTransport } from "viem";
import { presaleContract, usdtContract, getProgress } from "../contracts";


import ethIcon from "../asserts/images/coins/eth.svg";
import stakeIcon from "../asserts/images/coins/stake.svg";
import claimIcon from "../asserts/images/coins/claim.png";
import usdtIcon from "../asserts/images/coins/usdt.svg";
import slideLogo from "../asserts/images/preview/logo.png";

import left from "../asserts/images/left.png";
import right from "../asserts/images/right.png";

export function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new providers.Web3Provider(transport, network);
  const signer = provider.getSigner(account.address);
  return signer;
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: walletClient } = useWalletClient({ chainId });
  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : undefined),
    [walletClient]
  );
}

export default function Hero() {
  const { address } = useAccount();
  const { open } = useWeb3Modal();

  const { isConnected } = useAccount();

  const [deadline, setDeadline] = useState(new Date("2024-01-31T00:00:00"));
  const [tokenPrice, setTokePrice] = useState(0);
  const [tokenUsdtPrice, setTokeUsdtPrice] = useState(0);
  const [payAmount, setPayAmount] = useState(0);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [tokenUsdtAmount, setTokenUsdtAmount] = useState(0);
  const { disconnect } = useDisconnect();
  const [claimTokenAmount, setClaimTokenAmount] = useState(0);

  const [isClaim, setClaim] = useState(false);

  const [tapState, setTapState] = useState(1);
  const [progressStatus, setProgressStatus] = useState(0);
  const [totalSaled, setTotalSaled] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const toggleOpen = () => {
    open();
  };

  const countdownComplete = () => {
    setIsFinished(true);
  };

  useEffect(() => {
    window.init();
  },[])

  useEffect(() => {
    const getPrice = async () => {
      let tokenPrice = Number(await presaleContract.ethBuyHelper(1e10)) / (1e10);
      setTokePrice(tokenPrice);

      let tokenUsdtPrice =
        Number(await presaleContract.usdtBuyHelper(1e10)) / 1e22;
      setTokeUsdtPrice(tokenUsdtPrice);

      console.log("token price", tokenPrice);
      console.log("token usdt price", tokenUsdtPrice);
    };
    getPrice();
  }, []);

  useEffect(() => {
    const getProgressStatus = async () => {
      const progress = await getProgress();
      console.log("current progress", progress);
      setProgressStatus(progress[0]);
      setTotalSaled(progress[1]);
    };
    getProgressStatus();
  }, []);

  const getClaimTokenAmount = async (address: string) => {
    if (address) {
      console.log(address);
      let tokenAmount =
        Number(await presaleContract.getClaimAmount(address)) / 1e18;
      setClaimTokenAmount(tokenAmount);
    }
  };

  useEffect(() => {
    const getClaimstatus = async () => {
      let status = await presaleContract.getClaimStatus();
      setClaim(status);
    };

    getClaimTokenAmount(address || "");
    getClaimstatus();
  }, [address]);

  const onPayAmountChange = (e: any) => {
    try {
      if (e.target.value === "") {
        setPayAmount(0);
        setTokenAmount(0);
      } else {
        let amount = e.target.value;
        amount = amount.toString().replace(/^0+/, "");
        if (amount.length === 0) amount = "0";
        if (amount[0] === ".") amount = "0" + amount;
        setTokenAmount(amount * tokenPrice);
        setTokenUsdtAmount(amount * tokenUsdtPrice);
        setPayAmount(amount);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const signer = useEthersSigner();
  console.log("signer", signer);
  const onBuy = async () => {
    try {
      if (payAmount <= 0) {
        NotificationManager.error("Please input ETH amount");
        return;
      }

      // const prov = new ethers.providers.Web3Provider(provider);
      // let signer = await prov.getSigner();
      if (!signer) return;
      let signedPresaleContract = presaleContract.connect(signer);
      if (tapState === 1) {
        let tx = await signedPresaleContract.buy({
          value: toBigNum(payAmount, 18),
        });
        await tx.wait();
      } else if (tapState === 2) {
        console.log("payaount", payAmount, presaleContract.address, usdtContract);
        let signedUSDTContract = usdtContract.connect(signer);
        let approveTx = await signedUSDTContract.approve(
          presaleContract.address,
          toBigNum(payAmount, 6), {
          gasLimit: 50000
        }
        );
        await approveTx.wait();
        let buyTx = await signedPresaleContract.buyWithUSDT(toBigNum(payAmount, 6));
        await buyTx.wait();
      }
      NotificationManager.success("Buy Success");
    } catch (error: any) {
      if (error["code"] === "ACTION_REJECTED")
        NotificationManager.error("User Rejected transaction.");
      else NotificationManager.error("Insufficient funds.");
      console.log("error ----------->", error);
    }
  };

  const onClaim = async () => {
    try {
      if (!isClaim) {
        NotificationManager.error("Claim is not allowed yet.");
        return;
      }
      if (claimTokenAmount <= 0) {
        NotificationManager.error("Please input token amount");
        return;
      }
      if (!signer) return;
      let signedPresaleContract = presaleContract.connect(signer);
      let tx = await signedPresaleContract.claimUserToken();
      await tx.wait();
      NotificationManager.success("Claim Success");
    } catch (error: any) {
      if (error["code"] === "ACTION_REJECTED")
        NotificationManager.error("User Rejected transaction.");
      else NotificationManager.error("Claim Error.");
      console.log("error ----------->", error["code"]);
    }
  };

  return (
    <div className="crumina-grid">
      <header className="header" id="site-header">

        <div className="container">
          <div className="header-content-wrapper">
            <a href="index.html" className="site-logo">
              <img src="img/logo-primary.png" alt="Moon Flip" />
              <h2>Moon Flip</h2>
            </a>
            <nav id="primary-menu" className="primary-menu">
              <a href='javascript:void(0)' id="menu-icon-trigger" className="menu-icon-trigger showhide">
                <span className="mob-menu--title">Menu</span>
                <span id="menu-icon-wrapper" className="menu-icon-wrapper">
                  <svg width="1000px" height="1000px">
                    <path id="pathD" d="M 300 400 L 700 400 C 900 400 900 750 600 850 A 400 400 0 0 1 200 200 L 800 800"></path>
                    <path id="pathE" d="M 300 500 L 700 500"></path>
                    <path id="pathF" d="M 700 600 L 300 600 C 100 600 100 200 400 150 A 400 380 0 1 1 200 800 L 800 200"></path>
                  </svg>
                </span>
              </a>
              <ul className="primary-menu-menu">
                <li>
                  <a href="index.html">Home</a>
                </li>
                <li className="menu-item-has-children">
                  <a href="#tokenomics">Tokenomics</a>
                </li>
                <li className="menu-item-has-children">
                  <a href="#aidex">AI DEX</a>

                </li>

                <li className="menu-item-has-mega-menu menu-item-has-children">
                  <a href="#contract">Contract</a>

                </li>



                <li className="menu-item-has-mega-menu menu-item-has-children">
                  <a href="#faq">Faq</a>

                </li>

                <li className="">
                  <a href="#">Audit</a>
                </li>
              </ul>

            </nav>
            {!isConnected ? (
              <span className="btn btn--large btn--transparent btn--blue-light" onClick={() => open()}>
                Connect Wallet
              </span>
            ) : (
              <span className="btn btn--large btn--transparent btn--blue-light" onClick={() => disconnect()}>
                Disconnect
              </span>)}
            {/* <a href="#" className="btn btn--large btn--transparent btn--blue-light">Connect Wallet</a> */}
          </div>
        </div>
      </header>

      <div className="main-content-wrapper">
        <section data-settings="particles-1" className="main-section crumina-flying-balls particles-js bg-1 medium-padding120 responsive-align-center">
          <div className="container">
            <div className="row">
              <div className="col-lg-5 col-md-12 col-sm-12 col-xs-12">
                <img className="responsive-width-50" src="img/main.png" alt="image" />
              </div>
              <div className="col-lg-7 col-md-12 col-sm-12 col-xs-12">
                <header className="crumina-module crumina-heading heading--h1 heading--with-decoration">
                  <h1 className="heading-title f-size-90 weight-normal no-margin"><span className="weight-bold">Moon Flip</span> AI DEX
                  </h1>
                  <h2 className="c-primary">Blockchain solutions</h2></header>

                <div className="heading-text">Decentralized exchange-powered AI technology is revolutionizing the landscape of the financial world. By incorporating the latest advancements in artificial intelligence and leveraging the benefits of decentralized exchanges (DEX) and cryptocurrencies, this innovative solution offers a secure and efficient way to facilitate seamless transactions. The integration of AI algorithms allows for intelligent decision-making and automated processes, eliminating the need for intermediaries and ensuring transparency and fairness.
                </div><p></p>
                <a href="#" className="btn btn--x-large btn--primary btn--transparent btn--with-icon btn--icon-left">
                  <svg className="woox-icon icon-adobe-reader-symbol"><use xlinkHref="#icon-adobe-reader-symbol"></use></svg>
                  White Paper
                </a>
              </div>

            </div><hr className="divider" />

          </div>

        </section>
        <section className="medium-padding120 responsive-align-center">
          <div className="container">
            <div className="row pb100">
              <div className="col-lg-12 col-md-12 col0sm-12 col-xs-12">
                <div className="crumina-module crumina-module-slider clients--slider navigation-center-both-sides">

                  <div className="swiper-btn-next">
                    <svg className="woox-icon icon-line-arrow-right">
                      <use xlinkHref="#icon-line-arrow-right"></use>
                    </svg>
                  </div>

                  <div className="swiper-btn-prev">
                    <svg className="woox-icon icon-line-arrow-left">
                      <use xlinkHref="#icon-line-arrow-left"></use>
                    </svg>
                  </div>

                  <div className="row">
                    <div className="col-lg-10 col-lg-offset-1 col-md-12 col-sm-12 col-xs-12">
                      <div className="swiper-container" data-show-items="7" data-prev-next="2">
                        <div className="swiper-wrapper">

                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client2.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client3.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client4.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client5.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client5.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client6.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client7.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client8.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client9.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client10.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client11.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client12.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client13.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client14.png" className="" alt="logo" />
                            </a>
                          </div>
                          <div className="swiper-slide">
                            <a className="clients-item" href="#">
                              <img src="img/client15.png" className="" alt="logo" />
                            </a>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row bg-2">
              <div className="col-lg-6 col-md-12 col-sm-12 col-xs-12 mb30">
                <header className="crumina-module crumina-heading heading--h2 heading--with-decoration">
                  <img className="primary-dots mb30" src="img/dots.png" alt="dots" />
                  <h2 className="heading-title weight-normal">Hurry to Buy
                    <span className="weight-bold">Early in Moon Flip</span></h2>
                  <div className="heading-text">Moon Flip allows you to seamlessly invest in the most promising crypto projects.</div>
                </header>
                <p> The ultimate solution for crypto enthusiasts! Join our exclusive Crypto PreSale and unlock a world of limitless possibilities. With Moon Flip, we redefine professionalism in the crypto space. The sleek design and cutting-edge technology behind Moon Flip ensure a seamless experience for all traders. Stay ahead of the game with our intuitive features that make flipping between cryptocurrencies a breeze. Don't miss out on this groundbreaking opportunity! Get your hands on Moon Flip and elevate your crypto game to new heights. Invest in the future with confidence and let Moon Flip be your trusted companion along this exciting journey..
                </p>
                <div className="crumina-module crumina-counter-item counter--icon-left mt60">
                  <svg className="woox-icon">
                    <use xlinkHref="#icon-group"></use>
                  </svg>
                  <div className="counter-content">
                    <div className="counter-numbers counter">
                      <span data-speed="2000" data-refresh-interval="3" data-to="68000" data-from="2">68000</span>
                      <div className="units">+</div>
                    </div>
                    <h4 className="counter-title">Participants</h4>
                  </div>
                </div>

              </div>
              <div className="col-lg-6 col-md-12 col-lg-offset-0 col-sm-12 col-xs-12">
                <div className="widget w-distribution-ends countdown-bg1">
                  <div className="widget-container">
                    <div className="hero-header rounded-lg py-[25px] px-[20px] font-semibold text-center text-white text-[28px]">
                      {!isFinished ? (
                        <p className="flex flex-col gap-[5px] text-white font-sans uppercase text-[28px] m-0">
                          Presale ending in
                          <div className="w-full justify-center flex">
                            <Countdown
                              date={deadline}
                              onComplete={countdownComplete}
                              className="countdown"
                            />
                          </div>
                        </p>
                      ) : (
                        <div className="rounded-lg p-25 text-20 font-semibold text-center text-white">
                          Presale Discount Ended. Buy Now at Launch Price.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-[20px] px-[20px]">
                      <div className="font-semibold text-center text-[#01b6f5]">
                        Total Sold: {Math.floor(totalSaled).toLocaleString()}
                        /650,000,000,000
                      </div>
                      <ProgressBar value={progressStatus} assistiveText="test" />
                      <div className="relative">
                        <div className="px-[30px] text-[15px] font-semibold text-center">
                          1 $SUSOTO = $0.00001
                        </div>

                        <Divider className="absolute w-full top-[50%]" />
                      </div>
                      <div className="grid grid-cols-4 gap-[10px]">
                        <div
                          onClick={() => {
                            setTapState(1);
                          }}
                          className={`cursor-pointer bg-bgLight h-[44px] flex flex-row gap-[5px] items-center p-[5px] rounded-md hover:opacity-75 ${tapState === 1 ? "border-selected " : ""
                            }`}
                        >
                          <img
                            alt=""
                            src={ethIcon}
                            className="h-[25px] w-[25px]  rounded-full"
                          />
                          <span className="sm:text-[18px] text-[15px] font-bold">
                            ETH
                          </span>
                        </div>

                        <div
                          onClick={() => {
                            setTapState(2);
                          }}
                          className={`cursor-pointer bg-bgLight h-[44px] flex flex-row gap-[5px] items-center p-[5px] rounded-md hover:opacity-75 ${tapState === 2 ? "border-selected " : ""
                            }`}
                        >
                          <img
                            alt=""
                            src={usdtIcon}
                            className="h-[25px] w-[25px]  rounded-full"
                          />
                          <span className="sm:text-[18px] text-[15px] font-bold">
                            USDT
                          </span>
                        </div>

                        <div
                          onClick={() => {
                            setTapState(3);
                          }}
                          className={`cursor-pointer bg-bgLight h-[44px] flex flex-row gap-[5px] items-center p-[5px] rounded-md hover:opacity-75 ${tapState === 3 ? "border-selected " : ""
                            }`}
                        >
                          <img
                            alt=""
                            src={claimIcon}
                            className="h-[25px] w-[25px]  rounded-full"
                          />
                          <span className="sm:text-[18px] text-[15px] font-bold">
                            Claim
                          </span>
                        </div>

                        <div
                          className={`cursor-pointer bg-bgLight h-[44px] flex flex-row gap-[5px] items-center p-[5px] rounded-md hover:opacity-75`}
                        >
                          <a
                            href="https://freelancer.com"
                            target="_blank"
                            rel="noreferrer"
                            className="flex"
                          >
                            <img
                              alt=""
                              src={stakeIcon}
                              className="h-[25px] w-[25px]  rounded-full"
                            />
                            <span className="sm:text-[18px] text-[15px] font-bold">
                              Stake
                            </span>
                          </a>
                        </div>
                      </div>
                      <Divider />
                      {tapState < 3 && (
                        <>
                          <div className="grid grid-cols-2 gap-[20px]">
                            <div className="flex flex-col">
                              <div className="flex flex-row justify-between">
                                <span className="text-[15px] opacity-80">
                                  Amount in{" "}
                                  {tapState === 1 ? (
                                    <span className="font-semibold">ETH</span>
                                  ) : (
                                    <span className="font-semibold">USDT</span>
                                  )}{" "}
                                  you pay
                                </span>
                              </div>

                              <div className="relative h-[50px] flex flex-row items-center px-[10px] bg-bgLight rounded-md">
                                <input
                                  value={payAmount}
                                  className="default-input"
                                  onChange={onPayAmountChange}
                                />

                                <div className="absolute right-[10px] top-[10px] w-[30px] h-[30px]">
                                  {tapState === 1 ? (
                                    <img
                                      alt=""
                                      src={ethIcon}
                                      className="w-full h-full"
                                    />
                                  ) : (
                                    <img
                                      alt=""
                                      src={usdtIcon}
                                      className="w-full h-full"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <div className="flex flex-row justify-between">
                                <span className="text-[15px] opacity-80">
                                  <span className="font-semibold">$SUSOTO </span> you
                                  receive
                                </span>
                              </div>

                              <div className="relative h-[50px] flex flex-row items-center px-[5px] bg-bgLight rounded-md">
                                {tapState === 1 ? (
                                  <input
                                    value={tokenAmount.toFixed(3)}
                                    className="default-input"
                                    readOnly
                                  />
                                ) : (
                                  <input
                                    value={tokenUsdtAmount.toFixed(3)}
                                    className="default-input"
                                    readOnly
                                  />
                                )}{" "}
                                <div className="absolute right-[10px] top-[10px] w-[30px] h-[30px]">
                                  <img
                                    alt=""
                                    src={slideLogo}
                                    className="w-full h-full rounded-full"
                                  />
                                </div>

                              </div>
                            </div>
                          </div>

                          <div className="text-[15px] text-center">
                            0.015 ETH is reserved for gas. The actual amount used will
                            depend on the network.
                          </div>

                          {address && (
                            <div className="flex flex-row justify-center items-center">
                              <div
                                className="w-[70%] py-[10px] bg-bgBtn text-center rounded-full cursor-pointer hover:opacity-75 select-none"
                                onClick={onBuy}
                              >
                                <span className="text-white text-[15px]">Buy</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {tapState === 3 && (
                        <>
                          <div className="flex flex-col">
                            <div className="flex flex-row justify-between">
                              <span className="text-[15px] opacity-80">
                                Token Amount that you will can claim.
                              </span>
                            </div>

                            <div className="relative h-[50px] flex flex-row items-center px-[5px] bg-bgLight rounded-md">
                              <input
                                type="number"
                                value={claimTokenAmount}
                                className="default-input flex-1"
                                readOnly
                              />

                              <div className="w-[30px] h-[30px]">
                                <img
                                  alt=""
                                  src={slideLogo}
                                  className="w-full h-full"
                                />
                              </div>
                            </div>
                          </div>

                          {!isClaim && (
                            <div className="text-[13px] text-center text-red-500">
                              Claim is not available before the presale ended
                            </div>
                          )}

                          {address && (
                            <div className="flex flex-row justify-center items-center">
                              <div
                                onClick={onClaim}
                                className={`w-[70%] py-[10px] text-center rounded-full cursor-pointer hover:opacity-75 select-none ${isClaim ? "bg-bgBtn" : "bg-bgBtn/70"
                                  }`}
                              >
                                <span className="text-white text-[15px]">Claim</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {address && (
                        <div className="flex flex-row justify-center items-center">
                          <div
                            onClick={toggleOpen}
                            className="w-[70%] py-[10px] border border-borderColor text-center rounded-full cursor-pointer hover:opacity-75 select-none"
                          >
                            <span className="text-[15px]">
                              {getSubString(address || "")}
                            </span>
                          </div>
                        </div>
                      )}
                      {!address && (
                        <div className="flex flex-row justify-center items-center">
                          <div
                            onClick={toggleOpen}
                            className="w-[70%] py-[10px] bg-bgBtn text-center rounded-full cursor-pointer hover:opacity-75 select-none"
                          >
                            <span className="text-white text-[15px]">
                              Connect Wallet
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="text-[15px] text-center pb-[15px]">
                        Stage 2 price: $0.0000125
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        <section>
          <div className="container">
            <div className="row medium-padding80" id="tokenomics">
              <header className="crumina-module crumina-heading heading--h2 heading--with-decoration">

                <h2 className="heading-title heading--half-colored">Tokenomics</h2>

              </header>
              <div className="col-lg-6 col-md-12 col-sm-12 col-xs-12 mb30">

                <div className="crumina-module crumina-skills-item skills-item--bordered">
                  <div className="skills-item-info">
                    <span className="skills-item-title">Presale and Community Sale</span>
                  </div>
                  <div className="skills-item-meter">
                    <span className="skills-item-meter-active bg-green-lighter" style={{ width: '20%' }}><span className="skills-item-count"><span className="count-animate" data-speed="1000" data-refresh-interval="50" data-to="20" data-from="0"></span><span className="units">%</span></span></span>
                  </div>
                </div>

                <div className="crumina-module crumina-skills-item skills-item--bordered">
                  <div className="skills-item-info">
                    <span className="skills-item-title">Liquidity and Farming Rewards</span>
                  </div>
                  <div className="skills-item-meter">
                    <span className="skills-item-meter-active bg-primary-color" style={{ width: '30%' }}><span className="skills-item-count"><span className="count-animate" data-speed="1000" data-refresh-interval="50" data-to="30" data-from="0"></span><span className="units">%</span></span></span>
                  </div>
                </div>

                <div className="crumina-module crumina-skills-item skills-item--bordered">
                  <div className="skills-item-info">
                    <span className="skills-item-title">Ecosystem Reserve</span>
                  </div>
                  <div className="skills-item-meter">
                    <span className="skills-item-meter-active bg-red-light" style={{ width: '20%' }}><span className="skills-item-count"><span className="count-animate" data-speed="1000" data-refresh-interval="50" data-to="20" data-from="0"></span><span className="units">%</span></span></span>
                  </div>
                </div>

                <div className="crumina-module crumina-skills-item skills-item--bordered">
                  <div className="skills-item-info">
                    <span className="skills-item-title">Team</span>
                  </div>
                  <div className="skills-item-meter">
                    <span className="skills-item-meter-active bg-blue-light" style={{ width: '10%' }}><span className="skills-item-count"><span className="count-animate" data-speed="1000" data-refresh-interval="50" data-to="10" data-from="0"></span><span className="units">%</span></span></span>
                  </div>
                </div>
                <div className="crumina-module crumina-skills-item skills-item--bordered">
                  <div className="skills-item-info">
                    <span className="skills-item-title">Advisors</span>
                  </div>
                  <div className="skills-item-meter">
                    <span className="skills-item-meter-active bg-primary-color" style={{ width: '5%' }}><span className="skills-item-count"><span className="count-animate" data-speed="1000" data-refresh-interval="50" data-to="5" data-from="0"></span><span className="units">%</span></span></span>
                  </div>
                </div>

                <div className="crumina-module crumina-skills-item skills-item--bordered">
                  <div className="skills-item-info">
                    <span className="skills-item-title">Marketing Partnerships</span>
                  </div>
                  <div className="skills-item-meter">
                    <span className="skills-item-meter-active bg-green-lighter" style={{ width: "5%" }}><span className="skills-item-count"><span className="count-animate" data-speed="1000" data-refresh-interval="50" data-to="5" data-from="0"></span><span className="units">%</span></span></span>
                  </div>
                </div>

                <div className="crumina-module crumina-skills-item skills-item--bordered">
                  <div className="skills-item-info">
                    <span className="skills-item-title">Liquidity and Listing</span>
                  </div>
                  <div className="skills-item-meter">
                    <span className="skills-item-meter-active bg-blue-light" style={{ width: '10%' }}><span className="skills-item-count"><span className="count-animate" data-speed="1000" data-refresh-interval="50" data-to="10" data-from="0"></span><span className="units">%</span></span></span>
                  </div>
                </div>

              </div>

              <div className="col-lg-6 col-md-12 col-sm-12 col-xs-12 mt30">

                <img className="responsive-width-100" src="img/pie.png" alt="image" />



              </div>

            </div>
          </div>
        </section>
        <section>
          <div className="container">
            <div className="row medium-padding120">
              <header className="crumina-module crumina-heading heading--h2 heading--with-decoration">

                <h2 className="heading-title heading--half-colored">Token Distribution</h2>

              </header>
              <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                <div className="mCustomScrollbar scrollable-responsive-table" data-mcs-theme="dark">
                  <table className="pricing-tables-wrap-table-blurring">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Total Tokens</th>
                        <th>700,000,000</th>


                      </tr>
                    </thead>
                    <tbody>
                      <tr className="crumina-module crumina-pricing-table pricing-table--style-table-blurring c-brown">
                        <td>
                          1
                        </td>
                        <td>
                          <div className="pricing-thumb">
                            <img src="img/logo-primary.png" className="woox-icon" alt="MFL" />
                            <h6 className="pricing-title">Presale</h6>
                          </div>
                        </td>
                        <td>
                          <div className="currency-details-item">
                            <div className="value">175,000,000</div>
                          </div>
                        </td>


                      </tr>
                      <tr className="crumina-module crumina-pricing-table pricing-table--style-table-blurring c-blue">
                        <td>
                          2
                        </td>
                        <td>
                          <div className="pricing-thumb">
                            <img src="img/logo-primary.png" className="woox-icon" alt="bitcoin" />
                            <h6 className="pricing-title">Liquidity And Farming Rewards</h6>
                          </div>
                        </td>
                        <td>
                          <div className="currency-details-item">
                            <div className="value">210,000,000</div>
                          </div>
                        </td>

                      </tr>
                      <tr className="crumina-module crumina-pricing-table pricing-table--style-table-blurring c-blue-light">
                        <td>
                          3
                        </td>
                        <td>
                          <div className="pricing-thumb">
                            <img src="img/logo-primary.png" className="woox-icon" alt="bitcoin" />
                            <h6 className="pricing-title">Ecosystem Reserve</h6>
                          </div>
                        </td>
                        <td>
                          <div className="currency-details-item">
                            <div className="value">105,000,000</div>
                          </div>
                        </td>

                      </tr>
                      <tr className="crumina-module crumina-pricing-table pricing-table--style-table-blurring c-border-color">
                        <td>
                          4
                        </td>
                        <td>
                          <div className="pricing-thumb">
                            <img src="img/logo-primary.png" className="woox-icon" alt="bitcoin" />
                            <h6 className="pricing-title">Team </h6>
                          </div>
                        </td>
                        <td>
                          <div className="currency-details-item">
                            <div className="value">70,000,000</div>
                          </div>
                        </td>

                      </tr>
                      <tr className="crumina-module crumina-pricing-table pricing-table--style-table-blurring c-blue-lighter">
                        <td>
                          5
                        </td>
                        <td>
                          <div className="pricing-thumb">
                            <img src="img/logo-primary.png" className="woox-icon" alt="bitcoin" />
                            <h6 className="pricing-title">Advisors</h6>
                          </div>
                        </td>
                        <td>
                          <div className="currency-details-item">
                            <div className="value">35,000,000</div>
                          </div>
                        </td>

                      </tr>

                      <tr className="crumina-module crumina-pricing-table pricing-table--style-table-blurring c-border-color">
                        <td>
                          6
                        </td>
                        <td>
                          <div className="pricing-thumb">
                            <img src="img/logo-primary.png" className="woox-icon" alt="woox" />
                            <h6 className="pricing-title">Marketing partnerships</h6>
                          </div>
                        </td>
                        <td>
                          <div className="currency-details-item">
                            <div className="value">35,000,000</div>
                          </div>
                        </td>

                      </tr>
                      <tr className="crumina-module crumina-pricing-table pricing-table--style-table-blurring c-brown">
                        <td>
                          7
                        </td>
                        <td>
                          <div className="pricing-thumb">
                            <img src="img/logo-primary.png" className="woox-icon" alt="MFL" />
                            <h6 className="pricing-title">Liquidity and Listing</h6>
                          </div>
                        </td>
                        <td>
                          <div className="currency-details-item">
                            <div className="value">70,000,000</div>
                          </div>
                        </td>


                      </tr>
                    </tbody>

                  </table>
                </div>
              </div>
            </div>
            <hr className="divider" />
          </div>
        </section>
        <section className="pt-mobile-80">
          <div className="container" id="contract">
            <div className="row medium-padding100">
              <header className="crumina-module crumina-heading heading--h2 heading--with-decoration">

                <h2 className="heading-title heading--half-colored">MFL Contract</h2>

              </header>
              <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                <table>
                  <thead>
                    <tr>
                      <th>Address</th>
                      <th>Network</th>
                      <th>Token Symbol</th>
                      <th>Decimal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>0x</td>
                      <td>Ethereum Chain (ERC20)</td>
                      <td>MFL</td>
                      <td>18</td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>
            <hr className="divider" />
          </div>
        </section>

        <section className="medium-padding120 responsive-align-center">
          <div className="container" id="aidex">
            <div className="row">
              <div className="col-lg-6 col-md-12 col-sm-12 col-xs-12">
                <header className="crumina-module crumina-heading heading--h2 heading--with-decoration">
                  <div className="heading-sup-title">AI Decentralized Exchange</div>
                  <h2 className="heading-title weight-normal">The Rise of AI
                    <span className="weight-bold">Decentralized Exchanges</span></h2>
                  <div className="heading-text">Introducing our AI-based decentralized exchange - the epitome of fast, secure, and efficient trading. Experience lightning-fast execution and low fees as our advanced AI technology ensures seamless transactions. Say goodbye to intermediaries and hello to a new era of autonomy and trust. With our professional-grade platform, trade with confidence, knowing that your assets are safe and transactions are executed swiftly. Embrace the future of decentralized finance and join the revolution today..
                  </div>
                </header>

                <p>AI Decentralized Exchange – the future of cryptocurrency trading. Powered by cutting-edge artificial intelligence technology, our platform offers unparalleled security, efficiency, and transparency to traders worldwide. With our intelligent algorithms constantly analyzing market trends and executing trades, users can enjoy seamless and profitable transactions. Say goodbye to centralized exchanges and embrace the decentralized revolution. Join us today and experience the power of AI in your trading journey. Stay ahead of the curve..
                </p>


              </div>

              <div className="col-lg-6 col-md-12 col-sm-12 col-xs-12 mt30">
                <img className="responsive-width-50 " src="img/phone.png" alt="phone" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-dotted-map">
          <div className="container">
            <div className="row medium-padding300 align-center">
              <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                <img className="primary-dots mb30" src="img/dots.png" alt="dots" />

                <header className="crumina-module crumina-heading heading--h2 heading--with-decoration">
                  <h2 className="heading-title weight-normal">Moon Flip
                    <span className="weight-bold">digital world</span></h2>
                  <div className="heading-text">AI Blockchain Technology</div>
                </header>

                <div className="counters">
                  <div className="col-lg-3 col-md-6 col-sm-12 col-xs-12">
                    <div className="crumina-module crumina-counter-item">

                      <h4 className="counter-title">DeFi Wallet</h4>
                      <p className="counter-text"> The ultimate DeFi Wallet designed for professionals like you. Seamlessly manage your digital assets with this groundbreaking tool, offering unparalleled convenience and security.
                        With Moon Flip, your DeFi journey begins with a user-friendly interface that effortlessly navigates through the exciting world of decentralized finance. Its sleek design incorporates the latest encryption technology, ensuring the utmost protection for your valuable assets.
                        .</p>
                      <div className="counter-line"></div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 col-sm-12 col-xs-12">
                    <div className="crumina-module crumina-counter-item">

                      <h4 className="counter-title">Payment Gateway</h4>
                      <p className="counter-text">Introducing Moon Flip, the ultimate DeFi Payment Gateway that revolutionizes the way you transact securely and effortlessly. With its groundbreaking technology, Moon Flip allows you to seamlessly send and receive payments in the decentralized finance realm. With a professional tone, this game-changing platform ensures the utmost security while providing a user-friendly experience. Say goodbye to traditional payment gateways and enter the world of decentralized finance with Moon Flip. Experience the future of payments today.</p>
                      <div className="counter-line"></div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 col-sm-12 col-xs-12">
                    <div className="crumina-module crumina-counter-item">

                      <h4 className="counter-title">AI DEX</h4>
                      <p className="counter-text">The cutting-edge AI-powered DEX that revolutionizes the world of cryptocurrency trading. With its state-of-the-art algorithms, Moon Flip empowers traders with lightning-fast and accurate decision-making capabilities. Seamlessly integrated with the latest innovations, this professional-grade platform ensures effortless and secure transactions for all users. Uncover hidden opportunities, anticipate market trends, and take advantage of optimal trading scenarios, all with Moon Flip's intuitive interface. Stay one step ahead and embrace the future of cryptocurrency trading with Moon Flip. Experience the power of AI like never before. Trust us, it's a flipping good choice.</p>
                      <div className="counter-line"></div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 col-sm-12 col-xs-12">
                    <div className="crumina-module crumina-counter-item">

                      <h4 className="counter-title">AI Swap</h4>
                      <p className="counter-text">Our state-of-the-art technology analyzes multiple decentralized exchanges and liquidity pools to provide you with the best possible rates, ensuring that you get the most bang for your crypto assets. Say goodbye to the hassle of manually searching for the best rates – Moon Flip does all the hard work for you.
                        Security is our top priority. Moon Flip employs robust encryption and best-in-class security measures to keep your funds safe and your transactions private. Trade with confidence, knowing that your assets are protected.</p>
                      <div className="counter-line"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-1">

          <div className="container">
            <div className="row medium-padding120">
              <div className="crumina-module crumina-featured-block">
                <div className="image-block">
                  <img src="img/pc.png" alt="phone" />
                </div>
                <div className="text-block">
                  <header className="crumina-module crumina-heading heading--h2 heading--with-decoration">
                    <h2 className="heading-title weight-normal">Access
                      <span className="weight-bold">analytical market & price data</span></h2>
                    <div className="heading-text">Stay ahead of the curve by gaining valuable insights into market dynamics and competitor analysis. Discover hidden opportunities and make data-driven decisions to help your business thrive. Moon Flip provides you with comprehensive reports and real-time updates, enabling you to track market fluctuations effortlessly..</div>
                  </header>
                </div>
              </div>
            </div>


            <hr className="divider" />
          </div>

        </section>

        <section>
          <div className="container" id="faq">
            <div className="row medium-padding100">
              <header className="crumina-module crumina-heading heading--h2 heading--with-decoration">

                <h2 className="heading-title heading--half-colored">FAQ</h2>

              </header>
              <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12 mb30">
                <ul className="crumina-module crumina-accordion accordion--faqs" >

                  <li className="accordion-panel">
                    <div className="panel-heading">
                      <a href="#toggleSample7" className="accordion-heading collapsed" data-toggle="collapse" data-parent="#accordion" aria-expanded="false">
                        <span className="first-letter">Q</span>
                        <span className="title">What is Moon Flip ?</span>
                      </a>
                    </div>

                    <div id="toggleSample7" className="panel-collapse collapse" aria-expanded="false" role="tree">
                      <span className="first-letter">A</span>
                      <div className="panel-info">
                        Moon Flip is an innovative AI-powered decentralized exchange (DEX) that offers a crypto exchange platform and a secure wallet, all enhanced with advanced AI technology. With Moon Flip, users can enjoy lower costs and increased security for their cryptocurrency transactions. This platform endeavors to optimize the trading experience by combining cutting-edge technology with robust security measures.

                      </div>
                    </div>
                  </li>

                  <li className="accordion-panel">
                    <div className="panel-heading">
                      <a href="#toggleOne7" className="accordion-heading collapsed" data-toggle="collapse" data-parent="#accordion" aria-expanded="false">
                        <span className="first-letter">Q</span>
                        <span className="title">What is MFL Token?</span>
                      </a>
                    </div>

                    <div id="toggleOne7" className="panel-collapse collapse" aria-expanded="false" role="tree">
                      <span className="first-letter">A</span>
                      <div className="panel-info">
                        Moon Flip is a community-driven governance token for the Moon Flip platform, allowing token holders to participate in decision-making processes and help shape the future of the AI DEX.
                      </div>
                    </div>
                  </li>

                  <li className="accordion-panel">
                    <div className="panel-heading">
                      <a href="#toggleTwo7" className="accordion-heading collapsed" data-toggle="collapse" data-parent="#accordion" aria-expanded="false">
                        <span className="first-letter">Q</span>
                        <span className="title">Where can i buy MFL token?</span>
                      </a>
                    </div>

                    <div id="toggleTwo7" className="panel-collapse collapse" aria-expanded="false" role="tree">
                      <span className="first-letter">A</span>
                      <div className="panel-info">
                        As of now, Moon Flip (MFL) is in its presale phase, which means it is not yet available on traditional cryptocurrency exchanges or DeFi platforms like Uniswap. Beware of potential scams using MFL's name.
                        The only legitimate way to participate in the MFL presale is through our official website at <a href="https://moonflip.org/">MoonFlip.org</a> Please exercise caution and ensure you're on the official platform to avoid fraudulent schemes.
                      </div>
                    </div>
                  </li>

                  <li className="accordion-panel">
                    <div className="panel-heading">
                      <a href="#toggleFive7" className="accordion-heading collapsed" data-toggle="collapse" data-parent="#accordion" aria-expanded="false">
                        <span className="first-letter">Q</span>
                        <span className="title">When and Where will i receive MFL Tokens?</span>
                      </a>
                    </div>

                    <div id="toggleFive7" className="panel-collapse collapse" aria-expanded="false" role="tree">
                      <span className="first-letter">A</span>
                      <div className="panel-info">
                        You will be able to claim your MFL tokens after the presale concludes. This claiming process will take place on Moon Flip's official website.
                        .
                      </div>
                    </div>
                  </li>

                  <li className="accordion-panel">
                    <div className="panel-heading">
                      <a href="#toggleThree7" className="accordion-heading collapsed" data-toggle="collapse" data-parent="#accordion" aria-expanded="false">
                        <span className="first-letter">Q</span>
                        <span className="title">How many presale stages are there?</span>
                      </a>
                    </div>

                    <div id="toggleThree7" className="panel-collapse collapse" aria-expanded="false" role="tree">
                      <span className="first-letter">A</span>
                      <div className="panel-info">
                        Moon Flips's presale consists of 5 stages. For additional details, please visit: <a href="https://moonflip.org/">MoonFlip.org</a>
                      </div>
                    </div>
                  </li>

                  <li className="accordion-panel">
                    <div className="panel-heading">
                      <a href="#toggleFour7" className="accordion-heading collapsed" data-toggle="collapse" data-parent="#accordion" aria-expanded="false">
                        <span className="first-letter">Q</span>
                        <span className="title">When and where will MFL launch?</span>
                      </a>
                    </div>

                    <div id="toggleFour7" className="panel-collapse collapse" aria-expanded="false" role="tree">
                      <span className="first-letter">A</span>
                      <div className="panel-info">
                        Following the presale, MFL will launch on multiple centralized exchanges, including at least two top-tier exchanges.Stay tuned for official announcements about the specific launch date and trading platforms by following our social media channels.
                      </div>
                    </div>
                  </li>

                </ul>
              </div>
            </div>
          </div>
        </section>

      </div>

      <footer id="site-footer" className="footer ">

        <canvas id="can"></canvas>
        <div className="container">
          <div className="row">
            <div className="col-lg-6 col-lg-offset-3 col-md-6 col-md-offset-3 col-sm-12 col-sm-offset-0 col-xs-12">
              <div className="widget w-info">
                <a href="index.html" className="site-logo">
                  <img src="img/logo-primary.png" alt="Woox" />
                  <h2>Moon Flip</h2>
                </a>
                <p>AI-powered crypto blockchain solution. Designed to revolutionize the world of digital assets, Moon Flip combines advanced technology with unrivaled security, providing a seamless experience for users. With its intelligent algorithms, this innovative platform offers streamlined transactions, enhanced privacy, and real-time monitoring. Whether you're an experienced crypto enthusiast or just starting your journey, Moon Flip's professional approach ensures a smooth and reliable investment process. Stay ahead of the curve with Moon Flip and embark on a new era of digital wealth management.</p>
              </div>

              <div className="widget w-contacts">
                <ul className="socials socials--white">
                  <li className="social-item">
                    <a href="#">
                      <i className="fab fa-twitter woox-icon"></i>
                    </a>
                  </li>

                  <li className="social-item">
                    <a href="#">
                      <i className="fab fa-dribbble woox-icon"></i>
                    </a>
                  </li>

                  <li className="social-item">
                    <a href="#">
                      <i className="fab fa-instagram woox-icon"></i>
                    </a>
                  </li>

                  <li className="social-item">
                    <a href="#">
                      <i className="fab fa-linkedin-in woox-icon"></i>
                    </a>
                  </li>

                  <li className="social-item">
                    <a href="#">
                      <i className="fab fa-facebook-square woox-icon"></i>
                    </a>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>

        <div className="sub-footer">
          <div className="container">
            <div className="row">
              <div className="col-lg-6 col-lg-offset-3 col-md-6 col-md-offset-3 col-sm-12 col-sm-offset-0 col-xs-12">

                <span>© All right reserved 2024.</span>
                <span><a href="index.html">The Moon Flip</a> - AI DEX PreSale - MoonFlip.org.</span>



              </div>

            </div>
          </div>
        </div>

        <a className="back-to-top" href="#">
          <svg className="woox-icon icon-top-arrow">
            <use xlinkHref="#icon-top-arrow"></use>
          </svg>
        </a>
      </footer>
    </div>
  );
}
