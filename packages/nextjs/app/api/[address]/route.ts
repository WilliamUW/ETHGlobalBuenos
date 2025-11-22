import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import scaffoldConfig from "~~/scaffold.config";

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  // Validate address
  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
  }

  try {
    // Get the target network from config
    const targetNetwork = scaffoldConfig.targetNetworks[0];

    // Create public client to read from blockchain
    const publicClient = createPublicClient({
      chain: targetNetwork,
      transport: http(),
    });

    // Get deployed contract info
    const deployedContract = deployedContracts[targetNetwork.id]?.YourContract;

    if (!deployedContract) {
      return NextResponse.json({ error: "Contract not deployed on this network" }, { status: 500 });
    }

    // Call getReviews function from smart contract
    const reviews = (await publicClient.readContract({
      address: deployedContract.address,
      abi: deployedContract.abi,
      functionName: "getReviews",
      args: [address],
    })) as any[];

    // Transform reviews data
    const formattedReviews = reviews.map(review => ({
      platformName: review.platformName,
      starRating: Number(review.starRating),
      numberOfReviews: Number(review.numberOfReviews),
      ageOfAccount: Number(review.ageOfAccount),
      accountName: review.accountName,
      pictureId: review.pictureId,
    }));

    // Calculate summary statistics
    const totalReviewsCount = formattedReviews.length;
    const totalReviews = formattedReviews.reduce((sum, review) => sum + review.numberOfReviews, 0);
    const platforms = new Set(formattedReviews.map(r => r.platformName)).size;
    const averageStars =
      totalReviewsCount > 0
        ? formattedReviews.reduce((sum, review) => sum + review.starRating, 0) / totalReviewsCount
        : 0;
    const oldestAccountAge = totalReviewsCount > 0 ? Math.max(...formattedReviews.map(r => r.ageOfAccount)) : 0;

    // Return response
    return NextResponse.json({
      address,
      summary: {
        averageStars: Math.round(averageStars * 10) / 10, // Round to 1 decimal
        totalReviews,
        numberOfPlatforms: platforms,
        oldestAccountAge,
      },
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews from blockchain" }, { status: 500 });
  }
}
