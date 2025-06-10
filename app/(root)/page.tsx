import { Suspense } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import HomeDashboard from './components/home-dashboard'; // Client component

// Import necessary actions
import { getBills } from '@/lib/actions/bill-actions';
import { getVendors } from '@/lib/actions/vendor-actions';
// Use the new action for products
import { getAllProductsForCapital, getTopViewedProductsWithVendor } from '@/lib/actions/product-actions';
import { getOrders } from '@/lib/actions/order-actions'; // Assumed action
import { getAppointments } from '@/lib/actions/appointment-actions'; // Assumed action
import { getUsers } from '@/lib/actions/user-actions';
import { getShopVisits } from '@/lib/actions/shop-visit-actions';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';

export const metadata = {
	title: 'Dashboard | Golverd Admin',
	description: 'Overview of application statistics.',
};

export default function HomePage() {
	const queryClient = getQueryClient();

	// Prefetch all necessary data for the dashboard
	void queryClient.prefetchQuery({ queryKey: ['bills'], queryFn: getBills });
	void queryClient.prefetchQuery({ queryKey: ['vendors'], queryFn: getVendors });
	void queryClient.prefetchQuery({ queryKey: ['productsCapital'], queryFn: getAllProductsForCapital });
	void queryClient.prefetchQuery({ queryKey: ['orders'], queryFn: getOrders });
	void queryClient.prefetchQuery({ queryKey: ['appointments'], queryFn: getAppointments });
	void queryClient.prefetchQuery({ queryKey: ['users'], queryFn: getUsers });
	void queryClient.prefetchQuery({
		queryKey: ['topViewedProducts'],
		queryFn: async () => {
			return getTopViewedProductsWithVendor(5);
		}
	});
	void queryClient.prefetchQuery({
		queryKey: ['shopVisits'],
		queryFn: async () => {
			return getShopVisits();
		}
	});


	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<div>Loading Dashboard...</div>}>
				<HomeDashboard />
			</Suspense>
		</HydrationBoundary>
	);
}
