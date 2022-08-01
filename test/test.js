const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require("@ethersproject/bignumber");
let owner;
let provider;

describe("Vault contract", () =>{
    beforeEach(async() =>{
        [owner, addr1, addr2] = await ethers.getSigners();
        gameFactory = await ethers.getContractFactory("gameContract");
        gameDeployed = await gameFactory.deploy();
        gamblingFactory = await ethers.getContractFactory("gamblingVault");
        gamblingDeployed = await gamblingFactory.deploy(gameDeployed.address);
        gameDeployed.setVault(gamblingDeployed.address);
        provider = waffle.provider;
    })
    describe("Deployment", async() =>{
        it("Should set gameContract during deployment", async() =>{
            expect(await gamblingDeployed.gameAddress()).to.equal(gameDeployed.address)
        })
        
    })
    describe("Deposit function", () =>{
        it("Should mint the correct amount of shares", async() =>{
            let ethAmount = ethers.utils.parseEther('100');
            await gamblingDeployed.deposit({value: ethAmount})
            expect(await provider.getBalance(gamblingDeployed.address)).to.equal("100000000000000000000")
            expect(await gamblingDeployed.balanceOf(owner.address)).to.equal("100000000000000000000");
        })
        it("Should not accept value zero", async() =>{
            await expect(gamblingDeployed.deposit({value: 0})).to.be.revertedWith("Not possible to purchase zero shares")
        })
    })
    describe("Withdraw function", () =>{
        it("Should withdraw the same amount after the initial deposit deducted gas fees", async() =>{
            let ethAmount = ethers.utils.parseEther('100');
            await gamblingDeployed.deposit({value: ethAmount})
            expect(await provider.getBalance(gamblingDeployed.address)).to.equal("100000000000000000000")
            expect(await gamblingDeployed.balanceOf(owner.address)).to.equal("100000000000000000000");
            await gamblingDeployed.withdraw(BigNumber.from('100000000000000000000'));
            expect(await gamblingDeployed.balanceOf(owner.address)).to.equal(0);
            console.log(`ETH-Amount after gas : ${await provider.getBalance(owner.address)}`)
        })
        it("We deposit, transfer the same ETH amount in, withdraw the whole eth amount", async() =>{
            let ethAmount = ethers.utils.parseEther('200');
            console.log(await provider.getBalance(owner.address)) // first fetch
            await gamblingDeployed.deposit({value: ethAmount}); // deposit 100 eth, get 100 shares 
            console.log(await provider.getBalance(owner.address)) // second fetch
            await gameDeployed.connect(addr1).sendETH({value : ethAmount});
            await expect(gamblingDeployed.withdraw(BigNumber.from('200000000000000000001'))).to.be.revertedWith("Not possible due to reserve reservations")
            await(gamblingDeployed.withdraw(BigNumber.from('200000000000000000000')));
            console.log(await provider.getBalance(owner.address))
        })
        it("Deposit, other address deposit, withdraw", async() =>{
            let ethAmount = ethers.utils.parseEther('200');
            await gamblingDeployed.deposit({value: ethAmount});
            await gamblingDeployed.connect(addr1).deposit({value: ethAmount});
            expect(await gamblingDeployed.totalSupply()).to.equal(BigNumber.from("400000000000000000000"))
            expect(await gamblingDeployed.balanceOf(owner.address)).to.equal(BigNumber.from("200000000000000000000"))
            expect(await gamblingDeployed.balanceOf(owner.address)).to.equal(BigNumber.from("200000000000000000000"))
            await gamblingDeployed.withdraw(BigNumber.from("200000000000000000000"))
            await gamblingDeployed.connect(addr1).withdraw(BigNumber.from("200000000000000000000"))
            expect(await gamblingDeployed.balanceOf(owner.address)).to.equal(0)
            expect(await gamblingDeployed.balanceOf(owner.address)).to.equal(0)
        })
        it("Edge case 1: Deposit owner, game transfers eth, deposit addr1, owner withdraw", async() =>{
            let ethAmount = ethers.utils.parseEther('10');
            await gamblingDeployed.deposit({value: ethAmount}) // create 10 shares, 10 eth
            await gameDeployed.connect(addr2).sendETH({value: ethAmount}) // +10 eth 
            await gamblingDeployed.connect(addr1).deposit({value: ethAmount}) // create 5 shares +10eth
            const tx = await gamblingDeployed.withdraw(BigNumber.from('10000000000000000000'));
            const wait = await tx.wait();
            const args = wait.events[1].args;
            expect(args._amount).to.equal('20000000000000000000') // proof of working vault
        })



        it("Edge case 2: Deposit owner, game removes eth, deposit addr1, owner withdraw", async() =>{
            let ethAmount = ethers.utils.parseEther('100');
            await gamblingDeployed.deposit({value: ethAmount}) // 100 shares +100 eth
            await gameDeployed.reserveETH(BigNumber.from('10000000000000000000'));
            await gameDeployed.takeETH(BigNumber.from('10000000000000000000')); // -10 eth
            await gamblingDeployed.connect(addr1).deposit({value: ethAmount}); // 111 shares + 100 eth 
            expect(await gamblingDeployed.balanceOf(addr1.address)).to.equal('111111111111111111111')
            const tx = await gamblingDeployed.withdraw(BigNumber.from('100000000000000000000'))
            const wait = await tx.wait();
            const args = wait.events[1].args;
            expect(args[1]).to.be.equal('90000000000000000000')
        })

        it("Edge case 3: Deposit owner, game removes eth (10), deposit addr1, game transfers eth(20), owner withdraw", async() =>{
            let ethAmount = ethers.utils.parseEther('100');
            await gamblingDeployed.deposit({value: ethAmount}); // 100 shares balance: 100 eth totalSupply: 100
            await gameDeployed.reserveETH(BigNumber.from('10000000000000000000'));
            await gameDeployed.takeETH(BigNumber.from('10000000000000000000')) // balance: 90 eth
            expect(await provider.getBalance(gamblingDeployed.address)).to.equal(BigNumber.from('90000000000000000000'))
            expect(await provider.getBalance(gameDeployed.address)).to.equal(BigNumber.from('10000000000000000000'))
            await gamblingDeployed.connect(addr1).deposit({value: ethAmount}) // 111 shares, 190 eth, totalSupply: 211 
            let ethAmount2 = ethers.utils.parseEther('20');
            await gameDeployed.connect(addr2).sendETH({value: ethAmount2}) // 210 eth
            await gamblingDeployed.withdraw(BigNumber.from('100000000000000000000')) // 99 eth
            await gamblingDeployed.connect(addr1).withdraw(BigNumber.from('111111111111111111111'))



        })

        it("Edge case 4: Deposit owner, game transfers eth, owner withdraw, game transfers eth, owner deposit, check gameProfit", async() =>{
            let ethAmount = ethers.utils.parseEther('100');
            await gamblingDeployed.deposit({value: ethAmount});
            await owner.sendTransaction({
                to: gameDeployed.address,
                value: ethAmount
            })
            expect(await provider.getBalance(gameDeployed.address)).to.equal(BigNumber.from('100000000000000000000'))
            await gameDeployed.sendETH({value: ethAmount});
            const tx = await gamblingDeployed.withdraw(BigNumber.from('100000000000000000000'));
            const wait = await tx.wait();
            const args = wait.events[1].args[1];
            expect(args).to.equal('200000000000000000000')
            expect(await gamblingDeployed.gameProfit()).to.equal('100000000000000000000')
        })

        
    })
})