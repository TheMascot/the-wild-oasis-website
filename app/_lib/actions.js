'use server';

import { revalidatePath } from 'next/cache';
import { auth, signIn, signOut } from './auth';
import { getBookings } from './data-service';
import { supabase } from './supabase';
import { redirect } from 'next/navigation';

export async function createBooking(bookingData, formData) {
  // console.log(formData);
  // console.log(bookingData);
  const session = await auth();
  if (!session) throw new Error('You must be logged in!');

  const newBooking = {
    ...bookingData,
    guestId: session.user.guestId,
    numGuests: Number(formData.get('numGuests')),
    observations: formData.get('observations').slice(0, 1000),
    extrasPrice: 0,
    totalPrice: bookingData.cabinPrice,
    isPaid: false,
    hasBreakfast: false,
    status: 'unconfirmed',
  };

  const { error } = await supabase.from('bookings').insert([newBooking]);

  if (error) {
    console.error(error);
    throw new Error('Booking could not be created');
  }
  revalidatePath(`/cabins/${bookingData.cabinId}`);
  redirect('/cabins/thankyou');
}

export async function deleteBooking(bookingId) {
  // await new Promise((res) => setTimeout(res, 2000));

  const session = await auth();
  if (!session) throw new Error('You must be logged in!');

  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);
  if (!guestBookingIds.includes(bookingId)) {
    throw new Error('You are not allowed to delete this booking.');
  }

  const { error } = await supabase.from('bookings').delete().eq('id', bookingId);

  if (error) {
    console.error(error);
    throw new Error('Booking could not be deleted');
  }
  revalidatePath('/account/reservations');
}

export async function updateGuest(formData) {
  const session = await auth();
  if (!session) throw new Error('You must be logged in!');

  const nationalID = formData.get('nationalID');
  const [nationality, countryFlag] = formData.get('nationality').split('%');

  if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID)) throw new Error('Provide a correct national ID!');

  const updateData = { nationality, countryFlag, nationalID };

  const { error } = await supabase.from('guests').update(updateData).eq('id', session.user.guestId);

  if (error) {
    throw new Error('Guest could not be updated');
  }
  revalidatePath('/account/profile');
}

export async function updateReservation(formData) {
  // authentication
  const session = await auth();
  if (!session) throw new Error('You must be logged in!');

  const id = Number(formData.get('id'));

  // autherization
  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);
  if (!guestBookingIds.includes(id)) {
    throw new Error('You are not allowed to delete this booking.');
  }

  // building update data
  const updatedFields = {
    numGuests: Number(formData.get('numGuests')),
    observations: formData.get('observations').slice(0, 1000),
  };

  // mutation
  const { error } = await supabase.from('bookings').update(updatedFields).eq('id', id);

  if (error) {
    console.error(error);
    throw new Error('Reservation could not be updated');
  }

  // revalidation
  revalidatePath('/account/reservations');
  revalidatePath(`/account/reservations/edit/${id}`);
  // redirecting
  redirect('/account/reservations');
}

export async function signInAction() {
  await signIn('google', {
    redirectTo: '/account',
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
