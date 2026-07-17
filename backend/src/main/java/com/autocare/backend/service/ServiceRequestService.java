package com.autocare.backend.service;

import com.autocare.backend.dto.CustomerDashboardStats;
import com.autocare.backend.dto.DashboardStats;
import com.autocare.backend.entity.*;
import com.autocare.backend.repository.ServiceRequestRepository;
import com.autocare.backend.repository.UserRepository;
import com.autocare.backend.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    public ServiceRequestService(
            ServiceRequestRepository serviceRequestRepository,
            UserRepository userRepository,
            VehicleRepository vehicleRepository) {

        this.serviceRequestRepository = serviceRequestRepository;
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
    }

    private boolean isValidTransition(ServiceStatus currentStatus, ServiceStatus newStatus) {

        return switch (currentStatus) {

            case CREATED ->
                    newStatus == ServiceStatus.RECEIVED;

            case RECEIVED ->
                    newStatus == ServiceStatus.INSPECTION;

            case INSPECTION ->
                    newStatus == ServiceStatus.AWAITING_APPROVAL;

            case AWAITING_APPROVAL ->
                    newStatus == ServiceStatus.IN_PROGRESS;

            case IN_PROGRESS ->
                    newStatus == ServiceStatus.QUALITY_CHECK;

            case QUALITY_CHECK ->
                    newStatus == ServiceStatus.READY_FOR_PICKUP;

            case READY_FOR_PICKUP ->
                    newStatus == ServiceStatus.CLOSED;

            case CLOSED ->
                    false;
        };
    }

    // Customer creates a service request
    public ServiceRequest createRequest(ServiceRequest request) {

        request.setStatus(ServiceStatus.CREATED);
        request.setCreatedAt(LocalDateTime.now());

        return serviceRequestRepository.save(request);
    }

    // Manager views all requests
    public List<ServiceRequest> getAllRequests() {
        return serviceRequestRepository.findAll();
    }

    // Customer views own requests
    public List<ServiceRequest> getRequestsByCustomer(Long customerId) {

        return serviceRequestRepository.findByVehicle_Owner_Id(customerId);
    }

    // Vehicle service history
    public List<ServiceRequest> getVehicleServiceHistory(String vehicleNumber) {

        Vehicle vehicle = vehicleRepository.findByVehicleNumber(vehicleNumber)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        return serviceRequestRepository.findByVehicle(vehicle);
    }

    // Customer dashboard summary
    public CustomerDashboardStats getCustomerDashboardStats(Long customerId) {

        List<ServiceRequest> requests =
                serviceRequestRepository.findByVehicle_Owner_Id(customerId);

        CustomerDashboardStats stats = new CustomerDashboardStats();

        stats.setTotalRequests(requests.size());

        long completed = requests.stream()
                .filter(r -> r.getStatus() == ServiceStatus.CLOSED)
                .count();

        stats.setCompletedRequests(completed);

        stats.setActiveRequests(requests.size() - completed);

        return stats;
    }

    // Employee views assigned requests
    public List<ServiceRequest> getRequestsByEmployee(Long employeeId) {

        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRole() != Role.EMPLOYEE) {
            throw new RuntimeException("User is not an employee");
        }

        return serviceRequestRepository.findByEmployee(employee);
    }

    // Employee views active requests
    public List<ServiceRequest> getActiveRequestsByEmployee(Long employeeId) {

        return serviceRequestRepository.findByEmployee_IdAndStatusNot(
                employeeId,
                ServiceStatus.CLOSED);
    }

    public List<ServiceRequest> getRequestsByStatus(ServiceStatus status) {

        return serviceRequestRepository.findByStatus(status);
    }

    public Optional<ServiceRequest> getRequestById(Long id) {
        return serviceRequestRepository.findById(id);
    }

    public List<ServiceRequest> getEmployeeRequests(User employee) {
        return serviceRequestRepository.findByEmployee(employee);
    }

    // Manager assigns employee
    public ServiceRequest assignEmployee(Long requestId, Long employeeId) {

        ServiceRequest request = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Service Request not found"));

        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRole() != Role.EMPLOYEE) {
            throw new RuntimeException("Selected user is not an employee");
        }

        request.setEmployee(employee);

        return serviceRequestRepository.save(request);
    }

    // Employee updates status
    public ServiceRequest updateStatus(Long requestId, ServiceStatus newStatus) {

        ServiceRequest request = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Service Request not found"));

        ServiceStatus currentStatus = request.getStatus();

        if (!isValidTransition(currentStatus, newStatus)) {
            throw new RuntimeException(
                    "Invalid status transition: "
                            + currentStatus + " → " + newStatus);
        }

        request.setStatus(newStatus);

        if (newStatus == ServiceStatus.CLOSED) {
            request.setClosedAt(LocalDateTime.now());
        }

        return serviceRequestRepository.save(request);
    }

    // Manager views unassigned requests
    public List<ServiceRequest> getUnassignedRequests() {

        return serviceRequestRepository.findByEmployeeIsNull();
    }

    // Delete request
    public void deleteRequest(Long id) {
        serviceRequestRepository.deleteById(id);
    }

    // Dashboard statistics
    public DashboardStats getDashboardStats() {

        DashboardStats stats = new DashboardStats();

        stats.setTotalRequests(serviceRequestRepository.count());

        stats.setCreated(
                serviceRequestRepository.findByStatus(ServiceStatus.CREATED).size());

        stats.setReceived(
                serviceRequestRepository.findByStatus(ServiceStatus.RECEIVED).size());

        stats.setInspection(
                serviceRequestRepository.findByStatus(ServiceStatus.INSPECTION).size());

        stats.setInProgress(
                serviceRequestRepository.findByStatus(ServiceStatus.IN_PROGRESS).size());

        stats.setQualityCheck(
                serviceRequestRepository.findByStatus(ServiceStatus.QUALITY_CHECK).size());

        stats.setReadyForPickup(
                serviceRequestRepository.findByStatus(ServiceStatus.READY_FOR_PICKUP).size());

        stats.setClosed(
                serviceRequestRepository.findByStatus(ServiceStatus.CLOSED).size());

        stats.setUnassigned(
                serviceRequestRepository.findByEmployeeIsNull().size());

        return stats;
    }
}