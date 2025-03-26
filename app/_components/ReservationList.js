'use client';

import { deleteBooking } from '../_lib/actions';
import { useOptimistic } from 'react';
import ReservationCard from './ReservationCard';

function ReservationList({ bookings }) {
  const [optimisticBookings, optimisticDelete] = useOptimistic(
    bookings,
    (curBookings, bookingId) => {
      return curBookings.filter((booking) => booking.id !== bookingId);
    }
  );

  async function handleDelete(bookingId) {
    optimisticDelete(bookingId);
    await deleteBooking(bookingId);
  }

  return (
    <ul className="space-y-6">
      {optimisticBookings.map((booking) => (
        <ReservationCard onDelete={handleDelete} booking={booking} key={booking.id} />
      ))}
    </ul>
  );
}

export default ReservationList;
